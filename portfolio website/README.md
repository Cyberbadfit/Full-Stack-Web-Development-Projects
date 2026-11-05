# CYBERBADFIT Portfolio Website

A responsive, editorial-style developer portfolio built from the supplied design references. The site uses a high-contrast black, white, and red visual system, animated CSS details, and live public GitHub data with a reliable local fallback.

![Desktop preview](./preview.png)

## Highlights

- Responsive desktop and mobile layouts with an accessible sticky navigation and keyboard-dismissable mobile menu
- Interactive CSS 3D hero orb, orbits, motion details, scrolling marquee, and reduced-motion support
- Filterable project cards populated from the public `Cyberbadfit` GitHub profile when available
- Safe fallback project data when the GitHub API is unavailable or rate-limited
- Accessible landmarks, a skip link, external-link safety, and semantic controls
- Static Vite build: no backend, tracking, API token, or credential is required

## Tech stack

React · TypeScript · Vite · CSS

## Run locally

```bash
npm install
npm run dev
```

Open the local address printed by Vite (normally `http://localhost:5173`).

## Build for production

```bash
npm run build
npm run preview
```

The production-ready static files are generated in `dist/`.

## Project structure

```text
src/
  App.tsx              # Page composition and interactions
  styles.css           # Design system, layout, responsive behaviour, motion
  data/projects.ts     # Fallback project data
  lib/github.ts        # Public GitHub API integration
public/                # Favicon, robots.txt, sitemap placeholder
preview.png            # Desktop design preview
```

## Deployment

Deploy the static `dist/` directory to GitHub Pages, Vercel, Netlify, or any static host. For GitHub Pages under a repository subpath, set the Vite `base` option before building.

## Verification

`npm run build` completes successfully.
