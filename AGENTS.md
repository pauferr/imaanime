# AGENTS.md

Technical guide to Ima Anime for anyone working on the code, human or agent. The public description lives in `README.md`.

## Stack

- [Astro](https://astro.build) 7, **static** site. No UI frameworks or CSS libraries: HTML, native CSS, and TypeScript in Astro `<script>` tags.
- Data from the [official MyAnimeList API v2](https://myanimelist.net/apiconfig/references/api/v2): `GET /v2/anime/season/{year}/{season}`. Needs a free client ID (see Setup). The unofficial Jikan API was used before; its public service shut down on Oct 1, 2026.
- Node ≥ 22.12.

## Setup

Create a client ID at https://myanimelist.net/apiconfig (any app type; no OAuth needed for public data) and put it in `.env` (gitignored):

```sh
MAL_CLIENT_ID=your-client-id
```

On Vercel, add the same `MAL_CLIENT_ID` as a project environment variable.

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
  i18n.ts                 UI strings per locale and locale helpers
  pages/[...locale]/index.astro  season list: New/Continuing/All tabs, poster grid, search, sort, filters popover, modal
  pages/[...locale]/today.astro  today's broadcasts with countdowns
  layouts/Layout.astro    <head>, shared header (nav, JP/EN switch), CSS variables and base styles
  components/Modal.astro  detail <dialog> (markup and styles; native closing via closedby="any")
  lib/mal.ts              MAL season fetch and filtering, Anime type (already simplified data), caches
  lib/anilist.ts          AniList episode schedule (episode number + exact air time) and previous/next season
  lib/time.ts             Japan → local time conversion, "does it air today?", date/weekday formatting
  lib/modal.ts            openModal(anime): fills and opens the modal
.github/workflows/refresh.yml  rebuilds on Vercel every 6 h
```

## How it works

- **Data at build time**: `seasonNow()` fetches the current season from MAL (usually a single request of up to 500 entries; adult content excluded) and maps each entry to a flat `Anime` object holding only the fields the site uses. The published site is static HTML: visitors never call MAL.
- **Episodes (AniList)**: MAL has no per-episode schedule, so the build also asks [AniList](https://docs.anilist.co) (free, no key, 30 requests/min) for every episode airing from 2 days ago to 9 days ahead, matched by MAL id (`Anime.airings`). `/today` uses those exact times and episode numbers; `null` (AniList doesn't know the show) falls back to MAL's weekly slot without a number, and `[]` means a week off. The same query brings the direct previous/next season (`prequel`/`sequel`, preferring TV/ONA over movies; not the whole franchise), shown in the modal (Prequel / Sequel) with the next episode and "N of total" episodes. If AniList fails, the build continues without episode numbers or related seasons.
- **Episode labels**: "S03E05" in `/today` and the modal. Neither API has a season number, so `seasonNo` is guessed from titles ("3rd Season", "Season 3", "II") or set to 1 for new shows without a prequel; otherwise `null` and the label is just "E05" (arcs, "Part 2", remakes, long-running shows).
- **Formats**: `Anime.format` is MAL's `media_type`. Cards tag anything that isn't a regular TV series (ONA, Special…), the modal has a Format row, and specials show their format instead of an episode label.
- **Which shows**: everything airing now (this season's new shows, plus continuing ones that started in earlier seasons), this season's shows that haven't premiered yet, and this season's movies (released or upcoming; tagged MOVIE, no weekly slot so never on `/today`). Finished shows and music videos are excluded. `Anime.isNew` (starts this season) drives the New / Continuing tabs on `/`.
- **Dev cache**: in `dev`, the last good MAL response is saved to `node_modules/.cache/imaanime/season-now.json` and reused for 6 hours, so reloads and restarts don't wait on MAL. Delete that file to force a refetch. `build` never uses it.
- **When MAL fails**: in `dev`, the last cached response is used however old; with no cache the page shows the error, and the failure is remembered for 60 s so reloads fail fast. `build` fails and Vercel keeps the previous deployment.
- **Data on the client**: each page embeds the anime list in `<script type="application/json" id="animes">` via `toJsonScript()`, which escapes `<` so the data can never close the tag.
- **Air times**: MAL gives weekday (`"saturday"`) and time in JST (UTC+9, no daylight saving). `lib/time.ts` converts them to the user's time zone. Times like "25:30" (Japanese late-night notation) correctly overflow into the next day.
- **"Today" is per user**: `/today` renders every anime hidden, and the client shows the ones airing today in the user's time zone, updating every second (countdown, switch to "Aired", midnight rollover). It has its own title search.
- **Time zone**: always the browser's (`localTz()`), no picker. **Title language** (`titles`) is stored in `localStorage` (always inside try/catch). Tab, search, sort and filters on `/` are form fields whose state lives in the URL (defaults omitted). Search ignores the tab, so continuing shows are found from New too.
- **Filters panel**: a native `popover` (light dismiss, no JS), anchored to its button with CSS anchor positioning where supported and centered otherwise. Genres are listed by frequency.
- **Title language (Romaji / English)**: a segmented control in the header; pure CSS (`body:has(#titles-en:checked)`), no JS to show or hide titles. It is a title preference (`localStorage` key `titles`), independent of the UI locale.

## Languages (i18n)

The site ships in English only, but is structured for more locales:

- **All UI strings** live in `src/i18n.ts` (`ui.en`). Pages and components read them through `t = ui[locale]`; client scripts get the locale from `<html lang>` via `pageLocale()`.
- **No translated lists**: dates, times, numbers, durations, and weekdays (`weekdayName`) are formatted by `Intl` with the page locale.
- **Routes**: pages live in `src/pages/[...locale]/` and `localePaths()` generates one copy per locale. The default locale has no prefix (`/`, `/today`); others get one (`/es/`, `/es/today`). Build internal links with `localeUrl(locale, path)`.
- **Data stays as MAL provides it**: titles, synopses and genres come from MyAnimeList in English and are not translated. Only MAL's main genres are kept (`MAIN_GENRES` in `lib/mal.ts`); themes, demographics and explicit tags are dropped.

**To add a language**: add a dictionary to `ui` in `src/i18n.ts` (typed as `Dict`, so TypeScript flags any missing key). Nothing else is required. A language picker in the header and `hreflang` links are not built yet; add them together with the second language.

## Conventions

- **English everywhere**: UI text, code comments, commits, PRs, issues, docs, and the repository description. The site is English-only for now (no i18n).
- Simplest thing that works: native platform features before dependencies, no speculative abstractions. Deliberate shortcuts carry a `ponytail:` comment explaining their limits.
- External data is inserted with `textContent`, never `innerHTML`.
- Basic accessibility: native interactive elements (`<button>`, `<dialog>`, `<select>`), `:focus-visible`, and `prefers-reduced-motion`.
- Colors are CSS variables on `:root` using `light-dark()`, which follows the system theme. Page and modal transitions use native View Transitions and `@starting-style`.

## Deployment

On Vercel, which detects Astro with no configuration. `.github/workflows/refresh.yml` calls a Vercel deploy hook every 6 hours to rebuild with fresh data; it needs the `VERCEL_DEPLOY_HOOK` secret in GitHub Actions.
