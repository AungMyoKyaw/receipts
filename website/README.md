# receipts product website

A standalone, statically prerendered SvelteKit website for the macOS app. The website does not initialize Tauri, read the native database or share the browser-preview storage key.

## Develop

From this directory:

```sh
bun install --frozen-lockfile
bun run dev
```

Open `http://127.0.0.1:1421/`. The desktop application keeps its existing port and routes.

## Validate and build

```sh
bun run check
bun run test
bun run build
bun run preview
```

With `playwright-cli` installed and the site running, the reusable browser smoke test checks timer behavior, keyboard controls and five viewport widths:

```sh
playwright-cli -s=receipts-website open http://127.0.0.1:1421/
playwright-cli -s=receipts-website run-code --filename=scripts/browser-smoke.js
```

Restart `bun run preview` after rebuilding so its cached asset manifest matches the new output.

The static output is `build/`. It includes real HTML, local fonts and optimized screenshots. It needs no server-side runtime.

## Publish

GitHub Actions deploys this site to [https://aungmyokyaw.github.io/receipts/](https://aungmyokyaw.github.io/receipts/) when website files change on `master`. The Pages build sets the `/receipts` base path; local development keeps root-relative paths. The workflow checks, tests and builds the site before deployment.

## Content boundaries

- The timer demo is in-memory and separate from all app data. Navigation away from the page discards it.
- Screenshots show the real app with illustrative sessions from `../screenshots/`.
- The current install action explains how to build the app locally. No signed/notarized download, remote repository, pricing or waitlist endpoint is invented.
- Before public launch, configure a real distribution/source URL and canonical domain. Update the Open Graph image to an absolute URL on that domain. Review platform requirements if release support changes.
- No analytics or third-party font requests are included.

## Design authority

The website inherits `../DESIGN.md`, especially Overview, Colors, Typography and Shapes. Its composition is recorded in `../.impeccable/surfaces/website-src-routes-page-svelte.md`. Native popup dimensions are evidence, not the dimensions of the responsive marketing layout.

The website uses a cream proof sheet, carbon ink, proofing red, locally served Fraunces/Inter/JetBrains Mono, crop marks and perforations. Red retains its live/active role; green identifies the demo's saved session. The inverted ink section uses the same palette and is not a separate dark theme.
