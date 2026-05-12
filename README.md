# Bricklayer

Bricklayer is the core static site generator (JamBrick) for BaseBrick. It is designed to consume Nunjucks templates and Markdown with frontmatter, fetch content from a remote CMS (like Sonic.js), and generate a fully static, modular JAMstack build.

## Features

- **Eleventy-Style Build Pipeline**: Uses Nunjucks templating and gray-matter frontmatter for modular UI rendering.
- **Dynamic Content Fetching**: Automatically fetches content from a headless CMS based on configuration (`components/generic.json`) and generates individual pages for each content item with clean, SEO-friendly slugs.
- **Production Optimization**: In production mode (`--prod`), it minifies HTML and CSS, and compresses image assets using `sharp`.
- **Tailwind Integration**: Seamlessly builds Tailwind CSS using `@tailwindcss/cli`, supporting development and production (minified) builds.
- **Environment Variables**: Natively loads `.env` and `.dev.vars` (Cloudflare) files, makes variables accessible globally in Nunjucks templates, and interpolates variables in `generic.json`.
- **Automated Deployments**: Scaffolding optionally generates tailored GitHub Actions (`deploy.yml`) workflows for seamless CI/CD.
- **Cloudflare Native**: Integrates native Cloudflare Workers support, automatically configuring `deploy:prod` and `deploy:preview` environments mapped to `wrangler.toml`.
- **Centralized Management**: Includes a `bricklayer manage` command to securely register and sync your local `.basebrick.config` settings with a central Manager API.

## Installation

To create a new Bricklayer project with automatic scaffolding, run the `init` command:

```bash
npx bricklayer init
```

This interactive setup will create the default folder structure and ask if you'd like to scaffold a demo site with starter templates, as well as configure Sonic JS CMS integration automatically.

Alternatively, if you are working within the BaseBrick ecosystem locally, you can link it:

```bash
cd bricklayer
npm install
npm link
```

## Usage

You can use Bricklayer via its CLI interface or import it directly as a Node module in your build scripts.

### CLI

To run a standard development build (compiles templates, copies assets, builds Tailwind without minification):

```bash
bricklayer
```

To run a production build (minifies HTML/CSS, compresses images):

```bash
bricklayer --prod
```

To sync your project settings with a central Bricklayer Manager instance:

```bash
bricklayer manage
```

### Module

```javascript
import { buildSite } from 'bricklayer';

buildSite({
    isProd: process.env.NODE_ENV === 'production',
    cwd: process.cwd(),
    // Optional overrides for directories:
    // srcDir: 'src',
    // includesDir: 'src/_includes',
    // publicDir: 'public',
    // cssInput: 'src/assets/tailwind/input.css',
    // cssOutput: 'public/assets/css/style.css',
    // assetsSrc: 'src/assets',
    // assetsDest: 'public/assets'
}).catch(console.error);
```

## CMS Configuration

To enable remote CMS fetching, place a `generic.json` configuration file in `src/components/generic.json`:

```json
{
  "name": "sonic.js",
  "apiUrl": "/v1/posts",
  "productionUrl": "https://cms.basebrick.xyz",
  "locaLUrl": "http://localhost:3018",
  "indexPage": "blog",
  "postPage": "post"
}
```

- `indexPage`: The template (e.g., `blog.njk`) where an array of posts will be injected under the `posts` variable.
- `postPage`: The template (e.g., `post.njk`) that will be used to generate individual pages for each item fetched from the API. The generated HTML will be placed in a directory matching the `postPage` name (e.g., `public/post/my-slug.html`).

## Environment Variables

Bricklayer natively supports reading `.env` and `.dev.vars` (Cloudflare Pages) files from the project's root directory.

- **Nunjucks Templates:** Variables are automatically passed to Nunjucks templates under the global `env` object. E.g., `{{ env.MY_API_KEY }}`.
- **CMS Configuration:** Environment variables can be directly interpolated in `generic.json` strings using the `${VARIABLE_NAME}` syntax.

## Bricklayer Manager

Bricklayer includes a centralized dashboard to help you track and administer all your statically generated sites.

The **Bricklayer Manager** allows you to:
- View all deployed Bricklayer sites via an elegant web UI.
- Automatically track and store Cloudflare Worker endpoints.
- Access deep links directly to Cloudflare Dashboards for easy debugging.

You can find the source code and instructions for deploying your own manager instance in the `manager/` directory of the core [BrickLayer GitHub Repository](https://github.com/cryptoskillz/BrickLayer/tree/main/manager).

Once your manager is deployed, use the CLI command to securely sync any of your projects:

```bash
bricklayer manage
```

## Directory Structure

Bricklayer expects the following default structure (overridable via options):

```text
├── .github/
│   └── workflows/
│       └── deploy.yml  # Auto-generated GitHub Actions
├── cms/                # (Optional) Cloned Sonic JS CMS
├── src/
│   ├── _includes/      # Nunjucks layouts
│   ├── assets/         # Static assets (images, fonts, tailwind)
│   ├── components/     # Component config (e.g., generic.json)
│   ├── index.njk       # Pages
│   └── post.njk
├── public/             # Build output
├── .basebrick.config   # Bricklayer project settings
├── .gitignore          # Version control exclusions
├── wrangler.toml       # (Optional) Cloudflare configuration
└── package.json
```
