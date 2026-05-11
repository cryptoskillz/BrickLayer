# Bricklayer

Bricklayer is the core static site generator (JamBrick) for BaseBrick. It is designed to consume Nunjucks templates and Markdown with frontmatter, fetch content from a remote CMS (like Sonic.js), and generate a fully static, modular JAMstack build.

## Features

- **Eleventy-Style Build Pipeline**: Uses Nunjucks templating and gray-matter frontmatter for modular UI rendering.
- **Dynamic Content Fetching**: Automatically fetches content from a headless CMS based on configuration (`components/generic.json`) and generates individual pages for each content item with clean, SEO-friendly slugs.
- **Production Optimization**: In production mode (`--prod`), it minifies HTML and CSS, and compresses image assets using `sharp`.
- **Tailwind Integration**: Seamlessly builds Tailwind CSS using `@tailwindcss/cli`, supporting development and production (minified) builds.

## Installation

Since Bricklayer is a local module within the BaseBrick ecosystem, you can link it directly:

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

## Directory Structure

Bricklayer expects the following default structure (overridable via options):

```
├── src/
│   ├── _includes/      # Nunjucks layouts
│   ├── assets/         # Static assets (images, fonts, tailwind)
│   ├── components/     # Component config (e.g., generic.json)
│   ├── index.njk       # Pages
│   └── post.njk
├── public/             # Build output
└── package.json
```
