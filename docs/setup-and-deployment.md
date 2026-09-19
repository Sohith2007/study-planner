# Setup and Deployment

FocusPlan is a static single-page application: it has no server, no database service and no environment secrets. "Deployment" means building the static assets and hosting them anywhere that can serve files over HTTPS.

## 1. Prerequisites

| Requirement | Version | Why |
|---|---|---|
| Node.js | **20.19+ or 22.12+** | Required by Vite 8 (see `app/package.json`'s `engines` field, and `.pipeline/master-plan.md` §2) |
| npm | bundled with Node | Package manager used by this project (there is a committed `package-lock.json`) |
| A Chromium-capable environment | — | Needed only to run the Playwright e2e suite; `npx playwright install chromium` downloads it, no system browser required |

No database server, no API keys, and no `.env` file are needed anywhere in this project.

## 2. Environment variables

**None.** FocusPlan reads and writes only browser-local storage (IndexedDB and `localStorage`) and calls only browser-native Web APIs (Notifications, Web Audio). There is no `.env.example` in `app/` because there is nothing to configure — this was confirmed by every build phase's handoff (`.pipeline/handoffs/phase-P0.md`: "No env vars and no `.env`").

## 3. Local development

```bash
cd app
npm install
npx playwright install chromium   # only needed if you plan to run the e2e suite

npm run dev
# vite --port 5173 --strictPort
# -> http://localhost:5173
```

The dev server seeds the demo data (3 subjects, 3 exams, 12 topics, sample history) into IndexedDB on first load. To start from a clean slate instead, open the app and use **Data → Clear all**, or clear the `focusplan` IndexedDB database and the `focusplan.timer.v1` localStorage key from your browser's dev tools.

Useful scripts (from `app/package.json`):

| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `vite --port 5173 --strictPort` | Local dev server with HMR |
| `npm run build` | `tsc -b && vite build` | Type-checks the whole project, then produces a production build in `app/dist/` |
| `npm run preview` | `vite preview --port 4173` | Serves the production build locally, for a final check before deploying |
| `npm run lint` | `oxlint` | Lints the codebase (0 warnings/errors at the end of QA) |
| `npm run test:unit` | `vitest run` | Runs the unit test suite (scheduler, timer, stats, backup, etc.) |
| `npm run test:e2e` / `npx playwright test` | `playwright test` | Runs the Playwright e2e suite against a dev server it starts itself |

## 4. Tests

See `docs/testing.md` for the full strategy and coverage summary. Quick reference:

```bash
cd app
npm run test:unit        # Vitest, node environment — 165 tests across scheduler, timer, setup, planner, dashboard, data
npx playwright test      # Playwright, Chromium — 53 e2e tests covering every acceptance criterion
```

The Playwright config (`app/playwright.config.ts`) starts `npm run dev` itself via its `webServer` option (`reuseExistingServer: true`, so it will use a server you already have running), with `baseURL` `http://localhost:5173`. You do not need to start the dev server manually before running `npx playwright test`.

## 5. Production build

```bash
cd app
npm run build
```

This runs `tsc -b` (a strict type-check across the whole project, including test files) followed by `vite build`. It must exit 0 with no TypeScript errors — this is Acceptance Criterion AC-P0-1 and was verified in QA. Output goes to `app/dist/`, a set of static, hashed, cacheable assets (HTML, JS chunks — one per lazy-loaded route — CSS, and self-hosted font files) with no server-side pieces.

To sanity-check the build locally before deploying:

```bash
npm run preview
# -> http://localhost:4173
```

## 6. Deployment

Because `app/dist/` is a static bundle with **client-side routing** (React Router's `BrowserRouter`), any static host works as long as it rewrites unknown paths back to `index.html` (a standard SPA fallback rule) — otherwise a hard reload on, say, `/week` or `/dashboard` will 404.

### Recommended: Vercel

1. Push this repository to a Git provider Vercel supports (GitHub/GitLab/Bitbucket).
2. In Vercel, **Add New Project** and import the repo.
3. Set the project's **Root Directory** to `app/`.
4. Framework preset: **Vite**. Vercel will detect it automatically once the root directory is set; if asked explicitly:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
   - **Install command:** `npm install`
5. No environment variables need to be set.
6. Deploy. Vercel's Vite preset already applies the SPA rewrite Vercel needs for client-side routes; if you use a custom `vercel.json`, add:
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```

### Alternative: Netlify

1. **Base directory:** `app`
2. **Build command:** `npm run build`
3. **Publish directory:** `app/dist`
4. Add a `_redirects` file (in `app/public/`, so it's copied into `dist/`) containing:
   ```
   /*    /index.html   200
   ```

### Alternative: any static file host (GitHub Pages, S3 + CloudFront, Cloudflare Pages, nginx, etc.)

1. Run `npm run build` inside `app/`.
2. Upload the contents of `app/dist/` to the host.
3. Configure the host to serve `index.html` for any path that doesn't match a real file (SPA fallback). For nginx:
   ```nginx
   location / {
     try_files $uri /index.html;
   }
   ```
4. Serve over HTTPS. This isn't strictly required for the app to function, but the Web Notifications API used by the timer is only reliably available on secure origins (HTTPS or `localhost`) in modern browsers.

### Post-deploy checklist

- Load the deployed URL and confirm `/` redirects to `/today`.
- Reload directly on a deep link, e.g. `/week` or `/dashboard`, and confirm it renders the app rather than a 404 (this is the SPA-fallback rule above).
- Open the browser dev tools' Network tab and confirm there are no failed font/asset requests (fonts are self-hosted in `app/public/fonts/`, and QA confirmed zero requests to any other origin).
- Because everything is stored in the browser, data does not sync between devices or browsers — this is by design (USP #5), not a deployment defect.
