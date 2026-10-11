# AGENTS.md

Technical guide to Ima Anime for anyone working on the code, human or agent. The public description lives in `README.md`.

## Stack

- [Astro](https://astro.build) 7, **static** site. No UI frameworks or CSS libraries: HTML, native CSS, and TypeScript in Astro `<script>` tags.
- Data from [Jikan v4](https://docs.api.jikan.moe/) (free, unofficial MyAnimeList API): `GET /v4/seasons/now`.
- Node ≥ 22.12.

## Commands

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs dist/
npm run preview  # serves dist/
```

## Layout

```
src/
  pages/index.astro       season list: search, filters, sorting, modal
  pages/today.astro       today's broadcasts with countdowns
  layouts/Layout.astro    <head>, shared header (nav, time zone picker, JP/EN switch), CSS variables and base styles
  components/Modal.astro  detail <dialog> (markup and styles; native closing via closedby="any")
  lib/jikan.ts            paginated Jikan fetch, Anime type (already simplified data), in-memory cache
  lib/time.ts             countries/time zones, Japan → local time conversion, "does it air today?"
  lib/modal.ts            openModal(anime): fills and opens the modal
.github/workflows/refresh.yml  rebuilds on Vercel every 6 h
```

## How it works

- **Data at build time**: `seasonNow()` fetches every Jikan page (honors its 3 requests/s limit, retries on 429, removes duplicate entries, excludes adult content) and maps each entry to a flat `Anime` object holding only the fields the site uses. The published site is static HTML: visitors never call Jikan.
- **When Jikan fails**: there is no fallback data. In `dev` the page shows the error (retried on the next reload); `build` fails and Vercel keeps the previous deployment.
- **Data on the client**: each page embeds the anime list in `<script type="application/json" id="animes">` via `toJsonScript()`, which escapes `<` so the data can never close the tag.
- **Air times**: Jikan gives weekday and time in JST (UTC+9, no daylight saving). `lib/time.ts` converts them to the user's time zone. Times like "25:30" (Japanese late-night notation) correctly overflow into the next day.
- **"Today" is per user**: `/today` renders every anime hidden, and the client shows the ones airing today in the user's time zone, updating every second (countdown, switch to "Emitido", midnight rollover).
- **Preferences**: time zone (`tz`) and title language (`lang`) are stored in `localStorage` (always inside try/catch). Filters on `/` live in the URL.
- **JP/EN switch**: pure CSS (`body:has(#lang-en:checked)`), no JS to show or hide titles.

## Conventions

- **English** for code comments, commits, PRs, issues, docs, and the repository description: the project will be public. **The UI text is in Spanish.**
- Simplest thing that works: native platform features before dependencies, no speculative abstractions. Deliberate shortcuts carry a `ponytail:` comment explaining their limits.
- External data is inserted with `textContent`, never `innerHTML`.
- Basic accessibility: native interactive elements (`<button>`, `<dialog>`, `<select>`), `:focus-visible`, and `prefers-reduced-motion`.
- Colors are CSS variables on `:root`, with dark mode via `prefers-color-scheme`.

## Deployment

On Vercel, which detects Astro with no configuration. `.github/workflows/refresh.yml` calls a Vercel deploy hook every 6 hours to rebuild with fresh data; it needs the `VERCEL_DEPLOY_HOOK` secret in GitHub Actions.
