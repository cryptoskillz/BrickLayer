# Version History

## 1.0.0 (May 2026)

- **Initial Extraction**: Extracted the build pipeline from the BaseBrick frontend into a standalone, reusable Node module (`bricklayer`).
- **JAMstack Architecture**: Transitioned from client-side dynamic fetching to a fully static build process.
- **Dynamic Slugs**: Implemented Eleventy-style frontmatter-driven slug generation for SEO-friendly URLs.
- **Asset Optimization**: Added conditional production build steps including HTML/CSS minification and image compression via `sharp`.
- **CMS Integration**: Standardized remote CMS connectivity via `generic.json`, supporting dynamic generation of listing and detail pages from a remote source.
- **CLI Tooling**: Added a `bricklayer` bin script to run builds easily from the terminal.
