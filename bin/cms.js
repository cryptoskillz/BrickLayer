import fs from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';

export async function handleCmsCommand(cwd, action) {
    if (action === 'install') {
        console.log('\n📦 Installing Sonic JS CMS...');
        const cmsDir = path.join(cwd, 'cms');
        
        try {
            if (fs.existsSync(cmsDir)) {
                console.log('Directory cms/ already exists, skipping clone.');
            } else {
                console.log('Cloning Sonic JS repository...');
                execSync('git clone https://github.com/lane711/sonicjs.git cms', { stdio: 'inherit', cwd });
                fs.rmSync(path.join(cmsDir, '.git'), { recursive: true, force: true });
                console.log('Successfully cloned Sonic JS.');
            }

            console.log('\nInstalling CMS dependencies...');
            execSync('npm install', { stdio: 'inherit', cwd: cmsDir });
            console.log('\n✅ CMS installed successfully.');
            process.exit(0);
        } catch (e) {
            console.error('\n❌ CMS installation failed:', e.message);
            process.exit(1);
        }
    } else if (action === 'start') {
        const cmsDir = path.join(cwd, 'cms');
        if (!fs.existsSync(cmsDir)) {
            console.error('\n❌ CMS not installed. Run `npm run install:cms` first.');
            return;
        }

        console.log('\n🚀 Starting Sonic JS CMS locally...\n');
        
        const child = spawn('npm run dev', {
            cwd: cmsDir,
            stdio: 'inherit',
            shell: true
        });
        
        child.on('close', (code) => {
            if (code !== 0) {
                console.error(`\n❌ CMS exited with code ${code}`);
            }
        });
    } else if (action === 'deploy') {
        const cmsDir = path.join(cwd, 'cms');
        if (!fs.existsSync(cmsDir)) {
            console.error('\n❌ CMS not installed. Run `npm run install:cms` first.');
            return;
        }

        // Make sure Account ID is set before deploying
        const localConfigPath = path.join(cwd, '.basebrick.config');
        let accountId = '';
        if (fs.existsSync(localConfigPath)) {
            try {
                const projectConfig = JSON.parse(fs.readFileSync(localConfigPath, 'utf8'));
                if (projectConfig.accountId) {
                    accountId = projectConfig.accountId;
                }
            } catch (e) {}
        }
        if (accountId) {
            const wranglerPath = path.join(cmsDir, 'my-sonicjs-app', 'wrangler.toml');
            if (fs.existsSync(wranglerPath)) {
                let wranglerContent = fs.readFileSync(wranglerPath, 'utf8');
                wranglerContent = wranglerContent.replace(/account_id\s*=\s*"[^"]*"/g, `account_id = "${accountId}"`);
                
                // Auto-provision D1 Database if hardcoded ID exists
                if (wranglerContent.includes('b14707c3-a1c5-4565-8ffc-4f22f930d289')) {
                    console.log('\n🗄️ Provisioning new D1 Database for CMS...');
                    try {
                        const dbName = `sonicjs-db-${Date.now()}`;
                        const createOutput = execSync(`npx wrangler d1 create ${dbName}`, { 
                            stdio: 'pipe', 
                            encoding: 'utf8', 
                            cwd: cmsDir,
                            env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: accountId }
                        });
                        const dbMatch = createOutput.match(/database_id\s*=\s*"([^"]+)"/);
                        if (dbMatch && dbMatch[1]) {
                            const newDbId = dbMatch[1];
                            wranglerContent = wranglerContent.replace(/database_id\s*=\s*"b14707c3-a1c5-4565-8ffc-4f22f930d289"/, `database_id = "${newDbId}"`);
                            wranglerContent = wranglerContent.replace(/database_name\s*=\s*"sonicjs-worktree-main"/, `database_name = "${dbName}"`);
                            console.log(`✅ Created D1 Database: ${dbName} (${newDbId})`);
                        }
                    } catch (e) {
                        console.error('Failed to auto-provision D1 database. Please run `npm run db:reset` inside the cms folder.', e.message);
                    }
                }

                // Remove hardcoded R2 and KV bindings as they require explicit user provisioning
                wranglerContent = wranglerContent.replace(/\[\[r2_buckets\]\][\s\S]*?bucket_name\s*=\s*"sonicjs-ci-media"/, '');
                wranglerContent = wranglerContent.replace(/\[\[kv_namespaces\]\][\s\S]*?id\s*=\s*"a16f8246fc294d809c90b0fb2df6d363"/, '');

                fs.writeFileSync(wranglerPath, wranglerContent);
                
                // If we updated the DB, run migrations
                if (wranglerContent.includes('database_name = "sonicjs-db-')) {
                    console.log('🔄 Applying D1 Database migrations...');
                    try {
                        execSync('echo "y" | npx wrangler d1 migrations apply DB --remote', { 
                            stdio: 'inherit', 
                            cwd: path.join(cmsDir, 'my-sonicjs-app'),
                            env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: accountId }
                        });
                    } catch (e) {
                        console.error('Failed to apply migrations automatically. You may need to run `wrangler d1 migrations apply DB --remote` inside the cms folder.');
                    }
                }
            }
        }

        const isPreview = process.argv.includes('--preview');
        console.log(`\n🚀 Deploying CMS to Cloudflare ${isPreview ? 'Preview' : 'Production'}...\n`);
        
        const deployCmd = isPreview ? 'cd my-sonicjs-app && npx wrangler deploy --name my-sonicjs-app-preview' : 'npm run deploy --workspace=my-sonicjs-app';
        
        const tmpLog = path.join(cwd, '.wrangler-cms-deploy.log');
        let commandStr;
        if (process.platform === 'darwin') {
            commandStr = `script -q ${tmpLog} bash -c "${deployCmd}"`;
        } else if (process.platform === 'linux') {
            commandStr = `script -q -c "${deployCmd}" ${tmpLog}`;
        } else {
            commandStr = `${deployCmd} > ${tmpLog} 2>&1`;
        }

        const child = spawn(commandStr, {
            cwd: cmsDir,
            stdio: 'inherit',
            shell: true,
            env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: accountId }
        });

        child.on('close', async (code) => {
            let outputData = '';
            if (fs.existsSync(tmpLog)) {
                outputData = fs.readFileSync(tmpLog, 'utf8');
                outputData = outputData.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
                try { fs.unlinkSync(tmpLog); } catch (e) {}
            }

            if (code === 0) {
                const urlMatch = outputData.match(/https:\/\/[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+\.workers\.dev/i) || 
                                 outputData.match(/https:\/\/[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+\.pages\.dev/i) ||
                                 outputData.match(/(https:\/\/[^\s"'\r\n]+)/i);

                let deployedUrl = null;
                const lines = outputData.split('\n');
                for (const line of lines) {
                    if (line.includes('workers.dev') || line.includes('pages.dev')) {
                        const match = line.match(/(https:\/\/[^\s"'\r\n]+)/i);
                        if (match) deployedUrl = match[1];
                    }
                }
                
                if (!deployedUrl && urlMatch) {
                    deployedUrl = urlMatch[1] || urlMatch[0];
                }

                if (deployedUrl) {
                    console.log(`\n✅ CMS deployed successfully to: ${deployedUrl}`);
                    
                    const configPath = path.join(cwd, '.basebrick.config');
                    if (fs.existsSync(configPath)) {
                        try {
                            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                            if (isPreview) {
                                config.previewCmsUrl = deployedUrl;
                            } else {
                                config.cmsUrl = deployedUrl;
                            }
                            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                        } catch (e) {}
                    }
                    
                    if (!isPreview) {
                        const genericPath = path.join(cwd, 'src/components/generic.json');
                        if (fs.existsSync(genericPath)) {
                            try {
                                const genericJson = JSON.parse(fs.readFileSync(genericPath, 'utf8'));
                                genericJson.productionUrl = deployedUrl;
                                fs.writeFileSync(genericPath, JSON.stringify(genericJson, null, 2));
                                console.log('✅ Updated generic.json with CMS URL');
                            } catch (e) {}
                        }
                    }

                    const envPath = path.join(cwd, '.env');
                    if (fs.existsSync(envPath)) {
                        try {
                            let envContent = fs.readFileSync(envPath, 'utf8');
                            const envKey = isPreview ? 'PREVIEW_CMS_URL' : 'PROD_CMS_URL';
                            if (envContent.includes(`${envKey}=`)) {
                                envContent = envContent.replace(new RegExp(`${envKey}=.*(\\r?\\n|$)`), `${envKey}=${deployedUrl}$1`);
                            } else {
                                envContent += `\n${envKey}=${deployedUrl}\n`;
                            }
                            fs.writeFileSync(envPath, envContent);
                            console.log(`✅ Updated .env with ${envKey}`);
                        } catch (e) {}
                    }

                    console.log('\n🔄 Automatically updating Bricklayer Manager with new CMS URL...');
                    const manageModule = await import('./manage.js');
                    await manageModule.manageProject(cwd, {});
                    
                    process.exit(0);
                } else {
                    console.log('\n✅ CMS deployed, but could not automatically extract the URL.');
                    process.exit(0);
                }
            } else {
                console.error(`\n❌ CMS deployment failed with exit code ${code}`);
                process.exit(code);
            }
        });
    } else {
        console.log('Unknown cms action. Use: bricklayer cms install | start | deploy');
        process.exit(1);
    }
}
