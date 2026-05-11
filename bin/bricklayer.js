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
  help        Show this help message

Options:
  --prod      Run a production build (minifies HTML/CSS, compresses images)

Examples:
  bricklayer init        Initialize a project with a demo site, CMS, & Cloudflare Workers API
  bricklayer manage      Send project configuration to your central Bricklayer Manager
  bricklayer             Builds the site in development mode
  bricklayer --prod      Builds the site with production optimizations
`);
    process.exit(0);
}

if (args.includes('init')) {
    initProject(process.cwd()).catch(console.error);
} else if (args.includes('manage')) {
    import('./manage.js').then(m => m.manageProject(process.cwd())).catch(console.error);
} else {
    const isProd = args.includes('--prod');
    buildSite({ isProd, cwd: process.cwd() })
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}
