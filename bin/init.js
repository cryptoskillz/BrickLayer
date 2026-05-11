import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { execSync } from 'child_process';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

export async function initProject(cwd) {
    console.log('\n🧱 Welcome to Bricklayer Initialization 🧱\n');

    const confirm = await question('Initialize a new Bricklayer project in the current directory? (Y/n) ');
    if (confirm.toLowerCase() === 'n') {
        console.log('Initialization cancelled.');
        rl.close();
        return;
    }

    const existingFiles = fs.readdirSync(cwd).filter(f => f !== '.git' && f !== '.DS_Store');
    if (existingFiles.length > 0) {
        const wipe = await question('Warning: This directory is not empty. Would you like to wipe existing files before scaffolding? (y/N) ');
        if (wipe.toLowerCase() === 'y') {
            console.log('Wiping directory...');
            for (const file of existingFiles) {
                fs.rmSync(path.join(cwd, file), { recursive: true, force: true });
            }
            console.log('Directory wiped.\n');
        }
    }

    const projectNameRaw = await question('What is the name of your project? (bricklayer-site) ');
    const projectName = projectNameRaw.trim() || 'bricklayer-site';

    const githubRepoRaw = await question('What is the GitHub repository URL? (leave blank for none) ');
    const githubRepo = githubRepoRaw.trim();

    const demoSite = await question('Would you like to scaffold a demo site with starter templates? (Y/n) ');
    const includeDemo = demoSite.toLowerCase() !== 'n';

    const sonicJs = await question('Would you like to configure Sonic JS CMS integration? (Y/n) ');
    const includeSonic = sonicJs.toLowerCase() !== 'n';

    let pullSonic = false;
    if (includeSonic) {
        const pull = await question('Do you want to pull Sonic.js into the cms/ folder? (y/N) ');
        pullSonic = pull.toLowerCase() === 'y';
    }

    const cloudflare = await question('Would you like to start with Cloudflare? (Y/n) ');
    const includeCloudflare = cloudflare.toLowerCase() !== 'n';
    let cfFramework = '';
    if (includeCloudflare) {
        const fw = await question('Which API framework? (1)hono or (2)vanilla? (1/2) ');
        cfFramework = fw.trim() === '1' ? 'hono' : 'vanilla';
    }

    console.log('\nScaffolding project...');

    // 1. Create directory structure
    const dirs = [
        'src',
        'src/_includes',
        'src/assets',
        'src/assets/images',
        'src/assets/tailwind',
        'src/components',
        'public'
    ];

    dirs.forEach(dir => {
        const dirPath = path.join(cwd, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(` Created ${dir}/`);
        }
    });

    // Download dancing ninja
    const ninjaPath = path.join(cwd, 'src/assets/images/ninja-dance.gif');
    if (!fs.existsSync(ninjaPath)) {
        try {
            console.log(' Downloading dancing ninja asset...');
            const response = await fetch('https://www.rfgeneration.com/images/collections/gamepopper101/bitdance.gif', {
                headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
            });
            const buffer = await response.arrayBuffer();
            fs.writeFileSync(ninjaPath, Buffer.from(buffer));
        } catch (e) {
            console.log(' Failed to download ninja gif.');
        }
    }

    // 2. Create base CSS
    const cssPath = path.join(cwd, 'src/assets/tailwind/input.css');
    if (!fs.existsSync(cssPath)) {
        fs.writeFileSync(cssPath, `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`);
        console.log(' Created src/assets/tailwind/input.css');
    }

    if (includeDemo) {
        // Base layout
        const layoutPath = path.join(cwd, 'src/_includes/base.njk');
        if (!fs.existsSync(layoutPath)) {
            fs.writeFileSync(layoutPath, `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ title | default("Bricklayer Site") }}</title>
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body class="bg-gray-50 text-gray-900 font-sans p-8">
    <main class="max-w-4xl mx-auto">
        {{ content | safe }}
    </main>
</body>
</html>`);
            console.log(' Created src/_includes/base.njk');
        }

        const indexPath = path.join(cwd, 'src/index.njk');
        if (!fs.existsSync(indexPath)) {
            fs.writeFileSync(indexPath, `---
title: Welcome to Bricklayer
layout: base
---
<h1 class="text-4xl font-bold text-blue-600 mb-4">Welcome to Bricklayer</h1>
<p class="text-lg">Your statically generated JamBrick site is ready.</p>
${includeSonic ? '<p class="mt-4 mb-4"><a href="/blog.html" class="text-blue-500 underline">View the CMS Blog</a></p>' : ''}
<div class="mt-8">
    <img src="/assets/images/ninja-dance.gif" alt="Dancing Ninja" class="rounded-lg shadow-md max-w-xs" />
</div>
`);
            console.log(' Created src/index.njk');
        }
    }

    if (includeSonic) {
        // generic.json
        const genericPath = path.join(cwd, 'src/components/generic.json');
        if (!fs.existsSync(genericPath)) {
            fs.writeFileSync(genericPath, JSON.stringify({
                name: "sonic.js",
                apiUrl: "/v1/posts",
                productionUrl: "${PROD_CMS_URL}",
                locaLUrl: "http://localhost:3018",
                indexPage: "blog",
                postPage: "post"
            }, null, 2));
            console.log(' Created src/components/generic.json');
        }

        // Environment files
        const envPath = path.join(cwd, '.env');
        if (!fs.existsSync(envPath)) {
            fs.writeFileSync(envPath, `PROD_CMS_URL=https://cms.basebrick.xyz\n`);
            console.log(' Created .env file');
        }

        if (includeDemo) {
            // Blog Listing
            const blogPath = path.join(cwd, 'src/blog.njk');
            if (!fs.existsSync(blogPath)) {
                fs.writeFileSync(blogPath, `---
title: Blog
layout: base
---
<h1 class="text-3xl font-bold mb-6">Blog Posts</h1>
<div class="grid gap-4">
  {% for post in posts %}
    <div class="p-4 bg-white shadow rounded">
      <h2 class="text-xl font-semibold"><a href="/post/{{ post.slug }}.html" class="text-blue-600 hover:underline">{{ post.title }}</a></h2>
    </div>
  {% else %}
    <p>No posts found. Ensure your CMS is running and the API URL is correct.</p>
  {% endfor %}
</div>
<p class="mt-6"><a href="/index.html" class="text-blue-500 underline">&larr; Back home</a></p>`);
                console.log(' Created src/blog.njk');
            }

            // Post detail
            const postPath = path.join(cwd, 'src/post.njk');
            if (!fs.existsSync(postPath)) {
                fs.writeFileSync(postPath, `---
layout: base
url: post.title
---
<article>
  <h1 class="text-4xl font-bold mb-4">{{ post.title }}</h1>
  <div class="prose">
    {{ post.body | safe }}
  </div>
  <p class="mt-8"><a href="/blog.html" class="text-blue-500 underline">&larr; Back to blog</a></p>
</article>`);
                console.log(' Created src/post.njk');
            }
        }
    }

    console.log('\nConfiguring project dependencies...');
    const pkgPath = path.join(cwd, 'package.json');
    let pkg = {
        name: projectName,
        version: "1.0.0",
        type: "module",
        scripts: {
            build: "bricklayer",
            "build:prod": "bricklayer --prod"
        },
        dependencies: {},
        devDependencies: {
            "basebrick-bricklayer": "^1.0.0",
            "@tailwindcss/cli": "^4.0.0",
            "tailwindcss": "^4.0.0"
        }
    };
    if (githubRepo) {
        pkg.repository = { type: "git", url: githubRepo };
    }
    if (fs.existsSync(pkgPath)) {
        try {
            const existing = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            pkg = { ...pkg, ...existing };
            pkg.dependencies = { ...pkg.dependencies, ...existing.dependencies };
            pkg.devDependencies = { ...pkg.devDependencies, ...existing.devDependencies };
        } catch(e) {}
    }

    if (includeCloudflare) {
        console.log('\nConfiguring Cloudflare...');
        pkg.scripts.start = "wrangler dev";
        pkg.scripts.deploy = "npm run build:prod && wrangler deploy";
        pkg.devDependencies.wrangler = "^3.0.0";
        
        const wranglerPath = path.join(cwd, 'wrangler.toml');
        if (!fs.existsSync(wranglerPath)) {
            fs.writeFileSync(wranglerPath, `name = "${projectName}"\ncompatibility_date = "2024-05-12"\nmain = "api/worker.js"\n\n[assets]\ndirectory = "./public"\n`);
            console.log(' Created wrangler.toml');
        }

        const apiDir = path.join(cwd, 'api');
        if (!fs.existsSync(apiDir)) {
            fs.mkdirSync(apiDir, { recursive: true });
            console.log(' Created api/');
        }

        if (cfFramework === 'hono') {
            pkg.dependencies.hono = "^4.3.0";
            const workerPath = path.join(cwd, 'api/worker.js');
            if (!fs.existsSync(workerPath)) {
                fs.writeFileSync(workerPath, `import { Hono } from 'hono';\n\nconst app = new Hono();\n\napp.get('/api', (c) => {\n  return c.json({ message: 'Hello from Hono API!' });\n});\n\nexport default app;\n`);
                console.log(' Created api/worker.js (Hono API)');
            }
        } else {
            const workerPath = path.join(cwd, 'api/worker.js');
            if (!fs.existsSync(workerPath)) {
                fs.writeFileSync(workerPath, `export default {\n  async fetch(request, env, ctx) {\n    const url = new URL(request.url);\n    if (url.pathname.startsWith('/api')) {\n      return new Response(JSON.stringify({ message: 'Hello from Vanilla API!' }), { headers: { 'Content-Type': 'application/json' } });\n    }\n    return new Response('Not found', { status: 404 });\n  }\n};\n`);
                console.log(' Created api/worker.js (Vanilla API)');
            }
        }
    }
    
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    console.log(' Created/Updated package.json');

    if (pullSonic) {
        console.log('\nPulling Sonic JS CMS into cms/ directory...');
        try {
            if (fs.existsSync(path.join(cwd, 'cms'))) {
                console.log(' Directory cms/ already exists, skipping clone.');
            } else {
                execSync('git clone https://github.com/lane711/sonicjs.git cms', { stdio: 'inherit', cwd });
                fs.rmSync(path.join(cwd, 'cms', '.git'), { recursive: true, force: true });
                console.log(' Successfully cloned Sonic JS CMS.');
            }
        } catch (e) {
            console.error(' Failed to pull Sonic JS:', e.message);
        }
    }

    const gitignorePath = path.join(cwd, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
        fs.writeFileSync(gitignorePath, `node_modules/\n.DS_Store\n.env\n.dev.vars\n.wrangler/\n`);
        console.log(' Created .gitignore');
    }

    const basebrickConfigPath = path.join(cwd, '.basebrick.config');
    const basebrickConfig = {
        projectName,
        githubRepo,
        includeDemo,
        includeSonic,
        pullSonic,
        includeCloudflare,
        cfFramework
    };
    fs.writeFileSync(basebrickConfigPath, JSON.stringify(basebrickConfig, null, 2));
    console.log(' Created .basebrick.config');

    console.log('\n✅ Initialization complete!');
    console.log('\nNext steps:');
    console.log('  1. Run `npm install` to install dependencies');
    console.log('  2. Run `npm run build` to build the static site (or `npm run build:prod` for production)');
    if (includeCloudflare) {
        console.log('  3. Run `npm start` to test your Cloudflare Worker locally');
        console.log('  4. Run `npm run deploy` to deploy to Cloudflare\n');
    } else {
        console.log('');
    }

    rl.close();
}
