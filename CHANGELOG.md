# Version History

## 1.3.0 (May 2026)

- **Automated CMS Deployment**: The `bricklayer cms deploy` wrapper now seamlessly deploys your local Sonic JS instance to Cloudflare Workers using D1 migrations.
- **Smart Manager Sync**: When deploying a CMS (production or preview), the CLI intelligently extracts the generated worker URLs and automatically sends them to your configured Bricklayer Manager instance to keep your project dashboard up to date.

## 1.2.0 (May 2026)

- **CLI Deployment Wrapper**: Introduced `bricklayer deploy` command using a pseudo-TTY to seamlessly wrap `wrangler deploy` across environments, automatically intercepting and capturing live Cloudflare URLs.
- **Automated Config Sync**: The `bricklayer manage` tool now seamlessly parses Cloudflare `account_id` from `wrangler.toml` and syncs it with your central configuration.
- **Manager Dashboard Upgrades**: Added real-time, silent dashboard polling and integrated direct Cloudflare Worker dashboard deep links for registered sites.
- **Site Management**: Implemented site deletion functionality within the manager UI and securely moved the API Configuration Token into an isolated Settings page.

## 1.1.0 (May 2026)

- **Interactive Scaffolding**: Added `bricklayer init` command to scaffold new projects via an interactive wizard, generating `.gitignore` and `.basebrick.config` automatically.
- **Automated Deployments**: Scaffolding now optionally generates a tailored GitHub Actions `deploy.yml` workflow that orchestrates the site (and an isolated Sonic JS worker, if configured).
- **Cloudflare Native**: Integrated native Cloudflare Workers support (Vanilla or Hono) and static asset routing into the scaffolding workflow, automatically generating `deploy:prod` and `deploy:preview` environments in `wrangler.toml` and `package.json`.
- **Automated Sonic JS CMS**: Scaffolding now supports automatically cloning the Sonic JS repository into a local `/cms` folder and binding the frontend.
- **Centralized Management**: Added `bricklayer manage` command to securely register and sync local `.basebrick.config` data with a central Manager API.
- **Asset Enhancements**: The init command now automatically generates `src/assets/images` and downloads starter media directly.
- **Enhanced Logging**: Replaced intimidating Node.js fetch stack traces with clean, user-friendly warnings when remote CMS connections fail.
- **CLI Helpers**: The CLI help menu and post-init success output now clearly document the generated `npm run` workflow commands.

## 1.0.1 (May 2026)

- **Environment Variables**: Added native support for loading `.env` and `.dev.vars` (Cloudflare Pages) files. Environment variables are now globally accessible in Nunjucks templates via the `env` object and can be interpolated directly within `generic.json` configurations.

## 1.0.0 (May 2026)

- **Initial Extraction**: Extracted the build pipeline from the BaseBrick frontend into a standalone, reusable Node module (`bricklayer`).
- **JAMstack Architecture**: Transitioned from client-side dynamic fetching to a fully static build process.
- **Dynamic Slugs**: Implemented Eleventy-style frontmatter-driven slug generation for SEO-friendly URLs.
- **Asset Optimization**: Added conditional production build steps including HTML/CSS minification and image compression via `sharp`.
- **CMS Integration**: Standardized remote CMS connectivity via `generic.json`, supporting dynamic generation of listing and detail pages from a remote source.
- **CLI Tooling**: Added a `bricklayer` bin script to run builds easily from the terminal.
