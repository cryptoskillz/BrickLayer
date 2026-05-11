import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nunjucks from 'nunjucks';
import matter from 'gray-matter';
import { execSync } from 'child_process';

export async function buildSite(options = {}) {
    const cwd = options.cwd || process.cwd();
    const isProd = options.isProd || false;

    // Conditionally import minifiers so build doesn't fail if they aren't installed yet
    let minifyHtml;
    let sharp;
    try {
        if (isProd) {
            const htmlMinifier = await import('html-minifier');
            minifyHtml = htmlMinifier.minify;
            sharp = (await import('sharp')).default;
        }
    } catch (e) {
        console.warn('Compression libraries not installed. Run `npm install` in frontend to enable production compression.');
    }

    // ==========================================
    // BUILD CONFIGURATION
    // ==========================================
    const config = {
        srcDir: path.join(cwd, options.srcDir || 'src'),
        includesDir: path.join(cwd, options.includesDir || 'src/_includes'),
        publicDir: path.join(cwd, options.publicDir || 'public'),
        css: {
            input: path.join(cwd, options.cssInput || 'src/assets/tailwind/input.css'),
            output: path.join(cwd, options.cssOutput || 'public/assets/css/style.css')
        },
        assets: {
            src: path.join(cwd, options.assetsSrc || 'src/assets'),
            dest: path.join(cwd, options.assetsDest || 'public/assets')
        }
    };

    // Ensure output directories exist
    if (!fs.existsSync(config.publicDir)) {
        fs.mkdirSync(config.publicDir, { recursive: true });
    }
    const cssOutputDir = path.dirname(config.css.output);
    if (!fs.existsSync(cssOutputDir)) {
        fs.mkdirSync(cssOutputDir, { recursive: true });
    }

    // Copy and optionally compress static assets (e.g. images)
    if (fs.existsSync(config.assets.src)) {
        if (isProd && sharp) {
            console.log('Compressing images...');
            const copyAndCompress = async (src, dest) => {
                if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
                const entries = fs.readdirSync(src, { withFileTypes: true });
                const promises = [];
                
                for (const entry of entries) {
                    const srcPath = path.join(src, entry.name);
                    const destPath = path.join(dest, entry.name);
                    
                    if (entry.isDirectory()) {
                        promises.push(copyAndCompress(srcPath, destPath));
                    } else {
                        const ext = path.extname(entry.name).toLowerCase();
                        if (['.jpg', '.jpeg', '.png', '.webp', '.avif'].includes(ext)) {
                            promises.push(
                                sharp(srcPath)
                                    .jpeg({ quality: 80, force: false })
                                    .png({ quality: 80, force: false })
                                    .webp({ quality: 80, force: false })
                                    .avif({ quality: 80, force: false })
                                    .toFile(destPath)
                                    .then(info => {
                                        const originalSize = fs.statSync(srcPath).size;
                                        const saved = ((originalSize - info.size) / 1024).toFixed(2);
                                        console.log(` ↳ Compressed ${entry.name} (Saved ${saved} KB)`);
                                    })
                                    .catch(err => {
                                        console.error(`Error compressing ${entry.name}:`, err);
                                        fs.copyFileSync(srcPath, destPath);
                                    })
                            );
                        } else {
                            fs.copyFileSync(srcPath, destPath);
                        }
                    }
                }
                await Promise.all(promises);
            };
            await copyAndCompress(config.assets.src, config.assets.dest);
        } else {
            fs.cpSync(config.assets.src, config.assets.dest, { recursive: true });
            console.log('Copied static assets.');
        }
    }

    // Setup Nunjucks environment
    const env = nunjucks.configure([config.srcDir, config.includesDir], {
        autoescape: false,
        noCache: true
    });

    // Fetch remote content based on generic.json
    const genericJsonPath = path.join(config.srcDir, 'components', 'generic.json');
    let cmsConfig = null;
    let remoteData = [];

    if (fs.existsSync(genericJsonPath)) {
        try {
            cmsConfig = JSON.parse(fs.readFileSync(genericJsonPath, 'utf-8'));
            const baseUrl = isProd ? cmsConfig.productionUrl : cmsConfig.locaLUrl;
            const apiUrl = `${baseUrl.replace(/\/$/, '')}/${cmsConfig.apiUrl.replace(/^\//, '')}`;
            
            console.log(`Fetching remote content from ${apiUrl}...`);
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            
            if (cmsConfig.name === 'sonic.js') {
                remoteData = data.data || [];
            } else {
                remoteData = Array.isArray(data) ? data : (data.data || []);
            }
            
            // Extract URL pattern from post template frontmatter if available
            let urlFormat = 'post.title'; // default
            const postPagePath = path.join(config.srcDir, `${cmsConfig.postPage}.njk`);
            if (fs.existsSync(postPagePath)) {
                const postPageData = fs.readFileSync(postPagePath, 'utf-8');
                const parsed = matter(postPageData);
                if (parsed.data.url) {
                    urlFormat = parsed.data.url;
                }
            }
            
            // Ensure each post has a clean slug for URL generation based on the url format
            remoteData.forEach(post => {
                let slugSource = post.title || post.id || 'post';
                if (urlFormat.startsWith('post.')) {
                    const key = urlFormat.replace('post.', '');
                    slugSource = post[key] || slugSource;
                } else {
                    // If they provide a nunjucks string, evaluate it
                    slugSource = env.renderString(urlFormat, { post });
                }
                
                post.slug = slugSource.toString()
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)+/g, '');
            });
            
            console.log(`Successfully fetched ${remoteData.length} items from remote source.`);
        } catch (e) {
            console.error('Error fetching remote content:', e);
        }
    }

    // Build HTML pages
    const files = fs.readdirSync(config.srcDir).filter(file => file.endsWith('.njk'));

    for (const file of files) {
        try {
            const filePath = path.join(config.srcDir, file);
            const data = fs.readFileSync(filePath, 'utf-8');

            // Parse the front matter
            const parsed = matter(data);
            const content = parsed.content;
            const frontMatter = parsed.data;

            // Helper to render and output a single page
            const renderAndSave = (templateContent, templateData, outputFilename) => {
                const renderedContent = env.renderString(templateContent, templateData);
                let finalContent = renderedContent;

                if (frontMatter.layout) {
                    const layoutPath = path.join(config.includesDir, `${frontMatter.layout}.njk`);
                    if (fs.existsSync(layoutPath)) {
                        const layoutData = fs.readFileSync(layoutPath, 'utf-8');
                        finalContent = env.renderString(layoutData, {
                            ...templateData,
                            content: renderedContent
                        });
                    } else {
                        console.warn(`Layout ${frontMatter.layout} not found for ${file}`);
                    }
                }

                if (isProd && minifyHtml) {
                    const originalLength = finalContent.length;
                    finalContent = minifyHtml(finalContent, {
                        collapseWhitespace: true,
                        removeComments: true,
                        minifyCSS: true,
                        minifyJS: true
                    });
                    const savedBytes = originalLength - finalContent.length;
                    console.log(`Built HTML: ${outputFilename} (Minified by ${(savedBytes / 1024).toFixed(2)} KB)`);
                } else {
                    console.log(`Built HTML: ${outputFilename}`);
                }

                const outPath = path.join(config.publicDir, outputFilename);
                const outDir = path.dirname(outPath);
                if (!fs.existsSync(outDir)) {
                    fs.mkdirSync(outDir, { recursive: true });
                }
                fs.writeFileSync(outPath, finalContent);
            };

            if (cmsConfig && file === `${cmsConfig.postPage}.njk`) {
                // Generate multiple static post pages
                console.log(`Generating ${remoteData.length} static pages for ${file}...`);
                for (const post of remoteData) {
                    renderAndSave(content, { ...frontMatter, post }, `${cmsConfig.postPage}/${post.slug}.html`);
                }
            } else {
                // Generate normal static page
                const outputFilename = file.replace('.njk', '.html');
                const templateData = { ...frontMatter };
                
                if (cmsConfig && file === `${cmsConfig.indexPage}.njk`) {
                    templateData.posts = remoteData;
                }
                
                renderAndSave(content, templateData, outputFilename);
            }
        } catch (err) {
            console.error(`Error processing ${file}:`, err);
        }
    }

    console.log(`Successfully finished processing ${files.length} templates.`);

    // ==========================================
    // BUILD CSS (Tailwind)
    // ==========================================
    console.log('Building Tailwind CSS...');
    try {
        const tailwindArgs = isProd ? '--minify' : '';
        execSync(`npx tailwindcss -i "${config.css.input}" -o "${config.css.output}" ${tailwindArgs}`, { stdio: 'inherit' });
        console.log('Tailwind CSS built successfully!');
    } catch (error) {
        console.error('Failed to build Tailwind CSS:', error);
    }
}


