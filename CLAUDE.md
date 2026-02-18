# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TypeScript library for Webflow development, based on the Finsweet Developer Starter template. Uses `@finsweet/ts-utils` for Webflow utilities. Package manager is **pnpm** (>=10 required).

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Dev server with watch mode at http://localhost:3000 |
| `pnpm build` | Production build to `dist/` |
| `pnpm lint` | ESLint + Prettier check |
| `pnpm lint:fix` | Auto-fix ESLint issues |
| `pnpm check` | TypeScript type checking (`tsc --noEmit`) |
| `pnpm format` | Format with Prettier |
| `pnpm test` | Run Playwright E2E tests (starts dev server automatically) |
| `pnpm test:ui` | Run Playwright tests with interactive UI |
| `pnpm changeset` | Create a changeset for versioning/changelog |

## Architecture

### Build System
- **esbuild** bundles TypeScript from `src/` to `dist/`
- Entry points configured in `bin/build.js` via the `ENTRY_POINTS` array
- Dev mode: ES next target, sourcemaps, live reload via EventSource injection
- Production: ES2020 target, minified, no sourcemaps

### Source Structure
- `src/index.ts` — Main entry point; uses `window.Webflow.push()` lifecycle pattern
- `src/faq/index.ts` — FAQ module: accordion, search with highlighting, floating panel, public API
- `src/faq/types.ts` — TypeScript interfaces (`FaqItemElements`, `FaqConfig`, `FaqInstance`, etc.)
- `src/faq/config.ts` — Attribute constants (`ATTR`, `ROLES`, `CSS_VARS`) and `resolveConfig()`
- `src/utils/helpers.ts` — Shared utilities: `onDomReady`, `debounce`, `ensureId`, `normalizeText`, `smoothScrollTo`

### Path Alias
`$utils/*` maps to `src/utils/*` (configured in `tsconfig.json`). Use this instead of relative paths.

### Webflow Integration Pattern
```typescript
window.Webflow ||= [];
window.Webflow.push(() => {
  // Code runs after Webflow is ready
});
```

### Attribute Convention (Standard for All Curio Modules)

| Pattern | Usage | Example |
|---------|-------|---------|
| `cur-{module}-element="{role}"` | Mark DOM element roles | `cur-faq-element="trigger"` |
| `cur-{module}-{setting}` | Configuration via attributes | `cur-faq-accordion="true"` |
| `data-{module}-{state}` | Runtime state set by JS | `data-faq-open="true"` |
| `--cur-{module}-{property}` | CSS custom properties | `--cur-faq-highlight-bg` |

### FAQ Module (`src/faq/`)

DOM-driven FAQ with accordion, search highlighting, and programmatic API.

**Element roles** (via `cur-faq-element="..."`):\
`group`, `item`, `trigger`, `title`, `content`, `icon-open`, `icon-close`, `search`, `empty-state`

**Configuration attributes:**
- `cur-faq-activeclass` — CSS class toggled on open items (default: `is-active`)
- `cur-faq-highlightclass` — CSS class for search highlights (default: `faq-search-highlight`)
- `cur-faq-currenthighlightclass` — CSS class for current match (default: `faq-search-current`)
- `cur-faq-floatingsearch="true"` — Enable floating search panel
- `cur-faq-accordion="true"` — Only one item open at a time per group
- `cur-faq-default-open="0"` — Index of item to open on init
- `cur-faq-collapse-duration` — Collapse animation duration in ms (default: 250)
- `cur-faq-search-debounce` — Search debounce delay in ms (default: 300)

**CSS custom properties** (override on `:root` or any ancestor):
- `--cur-faq-highlight-bg` (default: `#eef`)
- `--cur-faq-current-highlight-bg` (default: `#5c6ac4`)
- `--cur-faq-collapse-duration` (default: `250ms`)
- `--cur-faq-icon-duration` (default: `150ms`)

**Custom events** (dispatched on the item/group element, bubble):
- `cur-faq:open` — `detail: { item: HTMLElement }`
- `cur-faq:close` — `detail: { item: HTMLElement }`
- `cur-faq:search` — `detail: { query: string, matchCount: number }`

**Public API** — `window.__curFaq`:
`open()`, `close()`, `toggle()`, `search()`, `clearSearch()`, `nextMatch()`, `prevMatch()`, `items`, `config`, `destroy()`

## Configuration

- **TypeScript**: Extends `@finsweet/tsconfig`
- **ESLint**: Uses `@finsweet/eslint-config` with `eslint-plugin-simple-import-sort`
- **Prettier**: 100 char width, single quotes, trailing commas (es5), semicolons

## CI/CD

- **CI** (on PR): Runs lint, type check, and Playwright tests
- **Release** (on push to master): Changesets creates version bump PRs and publishes to npm via OIDC (no tokens needed)
- To add multiple entry points, update the `ENTRY_POINTS` array in `bin/build.js`
