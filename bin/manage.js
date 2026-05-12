import fs from 'fs';
import path from 'path';
import readline from 'readline';
import os from 'os';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

export async function manageProject(cwd, options = {}) {
    const { reconfigure = false, url = null, token = null } = options;
    const localConfigPath = path.join(cwd, '.basebrick.config');
    
    if (!fs.existsSync(localConfigPath)) {
        console.error('❌ No .basebrick.config found in this directory. Run `bricklayer init` first.');
        rl.close();
        return;
    }

    const globalConfigPath = path.join(os.homedir(), '.bricklayer-manager.json');
    let managerConfig = {};

    if (fs.existsSync(globalConfigPath)) {
        try {
            managerConfig = JSON.parse(fs.readFileSync(globalConfigPath, 'utf8'));
        } catch (e) {
            console.error('Warning: Could not parse global manager config.');
        }
    }

    if (reconfigure) {
        managerConfig = {};
    }

    if (url) {
        managerConfig.url = url;
    }
    if (token) {
        managerConfig.token = token;
    }

    if (managerConfig.url && !managerConfig.url.endsWith('/api/sites')) {
        managerConfig.url = managerConfig.url.replace(/\/+$/, '') + '/api/sites';
    }

    if (!managerConfig.url) {
        const urlRaw = await question('What is your Bricklayer Manager URL? ');
        let url = urlRaw.trim();
        if (!url.endsWith('/api/sites')) {
            url = url.replace(/\/+$/, '') + '/api/sites';
        }
        managerConfig.url = url;
    }

    if (!managerConfig.token) {
        const tokenRaw = await question('What is your transfer token? ');
        managerConfig.token = tokenRaw.trim();
    }

    if (!managerConfig.url || !managerConfig.token) {
        console.error('❌ URL and token are required.');
        rl.close();
        return;
    }

    // Save for next time
    fs.writeFileSync(globalConfigPath, JSON.stringify(managerConfig, null, 2));

    let projectConfig;
    try {
        projectConfig = JSON.parse(fs.readFileSync(localConfigPath, 'utf8'));
    } catch(e) {
        console.error('❌ Could not parse .basebrick.config');
        rl.close();
        return;
    }

    // Consolidate legacy keys to prefer user edits
    if (projectConfig.projectName && projectConfig.projectName !== projectConfig.name) {
        projectConfig.name = projectConfig.projectName;
    }
    if (projectConfig.projectDescription && projectConfig.projectDescription !== projectConfig.description) {
        projectConfig.description = projectConfig.projectDescription;
    }
    if (projectConfig.githubRepo && projectConfig.githubRepo !== projectConfig.githubUrl) {
        projectConfig.githubUrl = projectConfig.githubRepo;
    }
    
    // Clean up duplicate legacy keys
    delete projectConfig.projectName;
    delete projectConfig.projectDescription;
    delete projectConfig.githubRepo;

    // Normalize githubUrl
    if (projectConfig.githubUrl) {
        projectConfig.githubUrl = projectConfig.githubUrl.replace(/^git\+/, '').replace(/\.git$/, '');
    }

    // Extract description from package.json if not explicitly set
    const pkgPath = path.join(cwd, 'package.json');
    if (fs.existsSync(pkgPath)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            if (pkg.description && !projectConfig.description) {
                projectConfig.description = pkg.description;
            }
            if (pkg.repository && pkg.repository.url && !projectConfig.githubUrl) {
                let repoUrl = pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, '');
                projectConfig.githubUrl = repoUrl;
            }
        } catch (e) {
            console.error('Warning: Could not parse package.json');
        }
    }

    // Extract name and account_id from wrangler.toml
    const wranglerPath = path.join(cwd, 'wrangler.toml');
    if (fs.existsSync(wranglerPath)) {
        try {
            const wranglerContent = fs.readFileSync(wranglerPath, 'utf8');
            const nameMatch = wranglerContent.match(/^name\s*=\s*"([^"]+)"/m);
            if (nameMatch && nameMatch[1] && !projectConfig.name) {
                projectConfig.name = nameMatch[1];
            }
            
            const accountMatch = wranglerContent.match(/^account_id\s*=\s*"([^"]+)"/m);
            if (accountMatch && accountMatch[1]) {
                projectConfig.accountId = accountMatch[1];
            } else if (process.env.CLOUDFLARE_ACCOUNT_ID) {
                projectConfig.accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
            }
        } catch (e) {
            console.error('Warning: Could not parse wrangler.toml');
        }
    }

    if (!projectConfig.accountId) {
        try {
            const { execSync } = await import('child_process');
            const whoamiOutput = execSync('npx wrangler whoami', { stdio: 'pipe', encoding: 'utf8' });
            const match = whoamiOutput.match(/Account ID[^\n]*?([a-f0-9]{32})/i);
            if (match && match[1]) {
                projectConfig.accountId = match[1];
            }
        } catch (e) {
            // Ignore if whoami fails
        }
    }

    // Save cleaned config back to .basebrick.config
    fs.writeFileSync(localConfigPath, JSON.stringify(projectConfig, null, 2));

    console.log(`\nSending project configuration to ${managerConfig.url}...`);

    let endpoint = managerConfig.url;
    if (!endpoint.startsWith('http')) {
        endpoint = `https://${endpoint}`;
    }

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${managerConfig.token}`
            },
            body: JSON.stringify(projectConfig)
        });

        if (response.ok) {
            console.log('✅ Successfully registered with Bricklayer Manager!');
        } else {
            console.error(`❌ Manager returned error: ${response.status} ${response.statusText}`);
        }
    } catch(e) {
        console.error(`❌ Failed to connect to manager: ${e.message}`);
    }

    rl.close();
}
