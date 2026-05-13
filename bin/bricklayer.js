#!/usr/bin/env node

import { buildSite } from '../index.js';
import { initProject } from './init.js';

const args = process.argv.slice(2);

const isHelp = args.includes('help') || args.includes('--help') || args.includes('-h');
const command = args.find(a => ['init', 'deploy', 'manage', 'cms'].includes(a));

if (isHelp) {
    if (command === 'init') {
        console.log(`
🧱 Bricklayer Init 🧱

Usage: bricklayer init

Scaffolds a new JamBrick project in the current directory. 
This interactive setup will:
  - Create the default folder structure (src, public, assets)
  - Generate a boilerplate Tailwind + Nunjucks site
  - Set up Cloudflare Workers for deployments (wrangler.toml)
  - Optionally install and configure the Sonic JS Headless CMS
  - Optionally generate a GitHub Actions CI/CD deployment workflow
`);
        process.exit(0);
    } else if (command === 'deploy') {
        console.log(`
🧱 Bricklayer Deploy 🧱

Usage: bricklayer deploy [options]

Builds and deploys your site to Cloudflare using Wrangler.

Options:
  --preview     Deploy to a preview environment instead of production.
                Useful for testing changes before they go live.
`);
        process.exit(0);
    } else if (command === 'manage') {
        console.log(`
🧱 Bricklayer Manage 🧱

Usage: bricklayer manage [options]

Registers your project with a central Bricklayer Manager instance to track 
costings, status, and repository links.

Options:
  -u, --url <url>      The API URL of your manager instance (e.g., https://manager.basebrick.xyz/api/sites)
  -t, --token <token>  Your secret transfer token for authentication
  -c, -n, --new        Clear cached manager credentials and reconfigure

Note:
  If using via npm scripts, separate flags with '--' (e.g., npm run manage -- -u <url>)
`);
        process.exit(0);
    } else if (command === 'cms') {
        console.log(`
🧱 Bricklayer CMS 🧱

Usage: bricklayer cms [action]

Manage the Sonic JS Headless CMS integration for your project.

Actions:
  install   Clones the CMS into the cms/ folder, installs dependencies,
            deploys to Cloudflare, extracts the deployed URL, updates your
            generic.json and .env files, and registers the URL with Manager.
`);
        process.exit(0);
    } else {
        console.log(`
🧱 Bricklayer CLI 🧱

Usage: bricklayer [command] [options]

Commands:
  (empty)     Run a standard development build
  init        Scaffold a new project (Demo, CMS, Cloudflare API)
  manage      Register this project with a Bricklayer Manager
  deploy      Deploy the project to Cloudflare and register its URL
  cms         Install and deploy Sonic JS CMS
  help        Show this help message

Options:
  --prod      Run a production build (minifies HTML/CSS, compresses images)

Run 'bricklayer <command> -h' for more information on a specific command.
`);
        process.exit(0);
    }
}

if (command === 'init') {
    initProject(process.cwd()).catch(console.error);
} else if (command === 'deploy') {
    const preview = args.includes('--preview');
    import('./deploy.js').then(m => m.deployProject(process.cwd(), { preview })).catch(console.error);
} else if (command === 'manage') {
    const reconfigure = args.includes('-c') || args.includes('--config') || args.includes('-n') || args.includes('--new') || process.env.npm_config_c || process.env.npm_config_config || process.env.npm_config_n;
    
    let url = (process.env.npm_config_url && process.env.npm_config_url !== 'true') ? process.env.npm_config_url : null;
    let token = (process.env.npm_config_token && process.env.npm_config_token !== 'true') ? process.env.npm_config_token : null;
    
    const uIndex = args.findIndex(a => a === '-u' || a === '--url');
    if (uIndex !== -1 && args[uIndex + 1] && !args[uIndex + 1].startsWith('-')) url = args[uIndex + 1];
    
    const tIndex = args.findIndex(a => a === '-t' || a === '--token');
    if (tIndex !== -1 && args[tIndex + 1] && !args[tIndex + 1].startsWith('-')) token = args[tIndex + 1];

    const manageIndex = args.indexOf('manage');
    const positionalArgs = args.slice(manageIndex + 1).filter(a => !a.startsWith('-'));
    
    if (!url && positionalArgs.length > 0) url = positionalArgs[0];
    if (!token && positionalArgs.length > 1) token = positionalArgs[1];

    import('./manage.js').then(m => m.manageProject(process.cwd(), { reconfigure, url, token })).catch(console.error);
} else if (command === 'cms') {
    const action = args[args.indexOf('cms') + 1];
    import('./cms.js').then(m => m.handleCmsCommand(process.cwd(), action)).catch(console.error);
} else {
    const isProd = args.includes('--prod');
    buildSite({ isProd, cwd: process.cwd() })
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}
