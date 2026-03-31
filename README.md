# SA-in-60s — Software Architecture in 60 Seconds

A static website for learning software architecture concepts through 60-second videos. Features 132 concepts across 10 learning paths, with bilingual DE/EN support and client-side progress tracking.

**Live site:** https://sa-in-60s.github.io

## Architecture

- **Static site generator** — `scripts/build.js` generates HTML pages from JSON data at build time
- **Vite 8** — bundles CSS/JS, copies generated `public/` pages to `dist/`
- **Tailwind CSS 4** — utility-first styling with dark theme
- **No runtime dependencies** — all dependencies are dev-only

### Data Model

```
data/
  concepts.json    # 132 concepts with DE/EN titles, YouTube URLs, prerequisites
  paths.json       # 10 learning paths, each referencing concept IDs
  translations.json # Bilingual UI strings
```

### Build Pipeline

1. `node scripts/build.js` generates static HTML into `public/` (concept pages, path pages, index, sitemap, robots.txt)
2. `vite build` processes `index.html`, bundles CSS/JS, copies `public/` into `dist/`

## Setup

```bash
npm install
```

## Commands

```bash
npm run dev          # Vite dev server
npm run build        # Generate static pages + Vite production build
npm run preview      # Preview production build
npm test             # Unit tests (Vitest)
npm run test:watch   # Unit tests in watch mode
npm run validate     # Validate data integrity (concepts, paths, cross-references)
npm run lint         # ESLint
npm run lint:fix     # ESLint auto-fix
npm run format:check # Prettier check
npm run format       # Prettier format
```

## Project Structure

```
src/
  main.js           # Client-side JS (i18n, progress tracking)
  styles/main.css   # Tailwind theme + custom styles
scripts/
  build.js          # Static site generator (HTML generation)
  build.test.js     # Build script tests
  validate.js       # Data validation (concepts, paths, cross-references)
  validate.test.js  # Validation tests
data/
  concepts.json     # Concept definitions
  paths.json        # Learning path definitions
  translations.json # UI translations (DE/EN)
public/             # Generated (gitignored) — static HTML pages
dist/               # Generated (gitignored) — final production build
```

## CI/CD

- **test.yml** — runs on PRs: lint, format check, tests, validation, build
- **deploy.yml** — runs on push to main: lint, validate, tests, build, deploy to GitHub Pages

## License

MIT
