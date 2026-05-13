#!/usr/bin/env node

import { buildSite } from '../index.js';
import { initProject } from './init.js';

const args = process.argv.slice(2);

if (args.includes('help') || args.includes('--help') || args.includes('-h')) {
    console.log(`
🧱 Bricklayer CLI 🧱

Usage: bricklayer [command] [options]

Commands:
  (empty)     Run a standard development build
  init        Scaffold a new project (Demo, CMS, Cloudflare API)
  manage      Register this project with a Bricklayer Manager
  deploy      Deploy the project to Cloudflare and register its URL
  help        Show this help message

Options:
  --prod      Run a production build (minifies HTML/CSS, compresses images)

Examples:
  bricklayer init        Initialize a project with a demo site, CMS, & Cloudflare Workers API
  bricklayer manage      Send project configuration to your central Bricklayer Manager
  bricklayer             Builds the site in development mode
  bricklayer --prod      Builds the site with production optimizations

Generated NPM Scripts (after init):
  npm run start           Test your Cloudflare Worker locally
  npm run deploy:preview  Deploy to a Cloudflare preview environment
  npm run deploy:prod     Deploy to Cloudflare production
`);
    process.exit(0);
}

if (args.includes('init')) {
    initProject(process.cwd()).catch(console.error);
} else if (args.includes('deploy')) {
    const preview = args.includes('--preview');
    import('./deploy.js').then(m => m.deployProject(process.cwd(), { preview })).catch(console.error);
} else if (args.includes('manage')) {
    const reconfigure = args.includes('-c') || args.includes('--config') || process.env.npm_config_c || process.env.npm_config_config;
    
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
} else {
    const isProd = args.includes('--prod');
    buildSite({ isProd, cwd: process.cwd() })
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}
