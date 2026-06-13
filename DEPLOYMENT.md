# Deployment

This project is a Vite + React + TypeScript app intended for Cloudflare Pages.

## Cloudflare Pages Settings

- Framework preset: Vite
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory:
  - Use this project folder if the repository root is `pc-github-pages-vite-react-typescript`.
  - If the repository contains this app as a subfolder, set the root directory to `pc-github-pages-vite-react-typescript`.
- Node.js version: use Node.js 20 or newer.

## Updating The Site

1. Install dependencies from the lockfile:
   ```bash
   npm ci
   ```
2. Verify the production build:
   ```bash
   npm run build
   ```
3. Commit and push source changes. Cloudflare Pages will rebuild from Git.

## Do Not Commit

- `node_modules/`
- `dist/`
- temporary logs or debug files such as `*.log`, `*.tmp`, `diff_output.txt`, and `non_ascii.txt`

## Asset Path Notes

The Vite config uses `base: './'` and relative public-asset build URLs so generated files remain portable in Cloudflare Pages builds. Public assets should stay under `public/` and source code should avoid hard-coded deployment-domain URLs.
