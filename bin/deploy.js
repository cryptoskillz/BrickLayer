import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export async function deployProject(cwd, options = {}) {
    const isPreview = options.preview || false;
    
    console.log(`\n🚀 Deploying to Cloudflare ${isPreview ? 'Preview' : 'Production'}...\n`);
    
    const args = ['deploy'];
    if (isPreview) {
        args.push('--env', 'preview');
    }
    
    const tmpLog = path.join(cwd, '.wrangler-deploy.log');
    
    let commandStr;
    if (process.platform === 'darwin') {
        commandStr = `script -q ${tmpLog} npx wrangler ${args.join(' ')}`;
    } else if (process.platform === 'linux') {
        commandStr = `script -q -c "npx wrangler ${args.join(' ')}" ${tmpLog}`;
    } else {
        // Windows fallback
        commandStr = `npx wrangler ${args.join(' ')} > ${tmpLog} 2>&1`;
    }

    const child = spawn(commandStr, { 
        cwd, 
        stdio: 'inherit',
        shell: true 
    });
    
    child.on('close', async (code) => {
        let outputData = '';
        if (fs.existsSync(tmpLog)) {
            outputData = fs.readFileSync(tmpLog, 'utf8');
            // Remove ANSI color codes
            outputData = outputData.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
            // Clean up the log file
            try { fs.unlinkSync(tmpLog); } catch (e) {}
        }

        if (code === 0) {
            // Try to extract URL from wrangler output
            const urlMatch = outputData.match(/https:\/\/[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+\.workers\.dev/i) || 
                             outputData.match(/https:\/\/[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+\.pages\.dev/i) ||
                             outputData.match(/https:\/\/[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+\.cloudflare\.com/i) ||
                             outputData.match(/(https:\/\/[^\s"]+)/i);

            let deployedUrl = null;
            const lines = outputData.split('\n');
            for (const line of lines) {
                if (line.includes('workers.dev') || line.includes('pages.dev')) {
                    const match = line.match(/(https:\/\/[^\s"]+)/i);
                    if (match) deployedUrl = match[1];
                }
            }
            
            // Fallback to the first URL we found if we didn't find a worker specific one
            if (!deployedUrl && urlMatch) {
                deployedUrl = urlMatch[1] || urlMatch[0];
            }
            
            if (deployedUrl) {
                console.log(`\n✅ Deployed successfully to: ${deployedUrl}`);
                
                const localConfigPath = path.join(cwd, '.basebrick.config');
                if (fs.existsSync(localConfigPath)) {
                    try {
                        const projectConfig = JSON.parse(fs.readFileSync(localConfigPath, 'utf8'));
                        if (isPreview) {
                            projectConfig.previewUrl = deployedUrl;
                            projectConfig.environment = 'Preview';
                        } else {
                            projectConfig.url = deployedUrl;
                            projectConfig.environment = 'Production';
                        }
                        
                        fs.writeFileSync(localConfigPath, JSON.stringify(projectConfig, null, 2));
                        console.log('✅ Added deployed URL to .basebrick.config');
                        
                        // Automatically push the new config to the manager
                        console.log('\n🔄 Automatically registering new URL with Bricklayer Manager...');
                        const manageModule = await import('./manage.js');
                        await manageModule.manageProject(cwd, {});
                    } catch(e) {
                        console.error('❌ Failed to update .basebrick.config with URL:', e);
                    }
                }
            } else {
                console.log('\n✅ Deployed successfully (Could not extract URL automatically)');
            }
        } else {
            console.error(`\n❌ Deployment failed with exit code ${code}`);
            process.exit(1);
        }
    });
}
