#!/usr/bin/env node

import { buildSite } from '../index.js';

const isProd = process.argv.includes('--prod');
buildSite({ isProd, cwd: process.cwd() }).catch(console.error);
