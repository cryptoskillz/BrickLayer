# Version History

## 1.1.0 (May 2026)

- **Interactive Scaffolding**: Added `bricklayer init` command to scaffold new projects via an interactive wizard, generating `.gitignore` and `.basebrick.config` automatically.
- **Cloudflare Native**: Integrated native Cloudflare Workers support (Vanilla or Hono) and static asset routing into the scaffolding workflow.
- **Automated Sonic JS CMS**: Scaffolding now supports automatically cloning the Sonic JS repository into a local `/cms` folder and binding the frontend.
- **Centralized Management**: Added `bricklayer manage` command to securely register and sync local `.basebrick.config` data with a central Manager API.
- **Asset Enhancements**: The init command now automatically generates `src/assets/images` and downloads starter media directly.
- **Enhanced Logging**: Replaced intimidating Node.js fetch stack traces with clean, user-friendly warnings when remote CMS connections fail.

## 1.0.1 (May 2026)

- **Environment Variables**: Added native support for loading `.env` and `.dev.vars` (Cloudflare Pages) files. Environment variables are now globally accessible in Nunjucks templates via the `env` object and can be interpolated directly within `generic.json` configurations.

## 1.0.0 (May 2026)

- **Initial Extraction**: Extracted the build pipeline from the BaseBrick frontend into a standalone, reusable Node module (`bricklayer`).
- **JAMstack Architecture**: Transitioned from client-side dynamic fetching to a fully static build process.
- **Dynamic Slugs**: Implemented Eleventy-style frontmatter-driven slug generation for SEO-friendly URLs.
- **Asset Optimization**: Added conditional production build steps including HTML/CSS minification and image compression via `sharp`.
- **CMS Integration**: Standardized remote CMS connectivity via `generic.json`, supporting dynamic generation of listing and detail pages from a remote source.
- **CLI Tooling**: Added a `bricklayer` bin script to run builds easily from the terminal.
