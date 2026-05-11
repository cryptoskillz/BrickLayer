import fs from 'fs';
import path from 'path';
import readline from 'readline';
import os from 'os';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

export async function manageProject(cwd) {
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

    if (!managerConfig.url) {
        const urlRaw = await question('What is your Bricklayer Manager URL? ');
        managerConfig.url = urlRaw.trim();
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
