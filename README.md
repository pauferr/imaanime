# 今 Ima Anime

**Every anime airing this season, at a glance.** Live at **[imaanime.vercel.app](https://imaanime.vercel.app)**.

*Ima* (今) means "now" in Japanese: this is the anime of right now.

## What you can do

- **Browse the whole season**: every anime airing now, with its cover, MyAnimeList score and number of voters. Tabs separate this season's new shows from the ones continuing from earlier seasons, and tags mark what's new, continuing, airing today, or not a regular TV series (ONA, special, movie).
- **Search and filter**: find a show by name, or filter by air day, type and genre. Sort by newest, top rated, most popular, or title.
- **See the full details**: tap any anime for its synopsis, episodes aired so far, the next episode with its date, studio, broadcast time, and links to its previous and next season.
- **What's on today**: the **Today** page shows what's **up next**, with a countdown and the episode number (e.g. S02E05), and what has **already aired today**, most recent first.
- **Air times in your time zone**: every broadcast is shown in your local time, automatically.
- **Settings** (gear icon): titles in romaji or English, 24- or 12-hour clock, and a different time zone if you need one.
- **Made for phones too**: details, filters and settings open as bottom sheets you can swipe down to close.

## Where the data comes from

Information and scores come from [MyAnimeList](https://myanimelist.net), through its official API; episode numbers and exact air times come from [AniList](https://anilist.co). Both are refreshed several times a day.

Ima Anime is an independent project and is not affiliated with MyAnimeList or AniList.

## Privacy

The site uses [Umami](https://umami.is), a privacy-friendly analytics tool: no cookies, no personal data, nothing shared with advertisers.

## Run it yourself

You need [Node.js](https://nodejs.org) 22.12 or newer and a free MyAnimeList API client ID.

1. **Get a MyAnimeList client ID**: sign in at [myanimelist.net/apiconfig](https://myanimelist.net/apiconfig), click *Create ID*, choose any app type (e.g. *web*) and any redirect URL (e.g. `http://localhost`). Copy the **Client ID**.
2. **Clone and configure**:
   ```sh
   git clone https://github.com/pauferr/imaanime.git
   cd imaanime
   cp .env.example .env
   ```
   Open `.env` and paste your client ID after `MAL_CLIENT_ID=`.
3. **Install and start**:
   ```sh
   npm install
   npm run dev
   ```
   Open [localhost:4321](http://localhost:4321). The first load takes a few seconds while it downloads the season; after that it's cached locally for 6 hours.

To build the static site: `npm run build` (output in `dist/`), and `npm run preview` to serve it.

### Environment variables

| Variable | Required | What it is |
|---|---|---|
| `MAL_CLIENT_ID` | **Yes** | MyAnimeList API client ID ([create one](https://myanimelist.net/apiconfig)). The build fails without it. |
| `UMAMI_WEBSITE_ID` | No | [Umami Cloud](https://cloud.umami.is) website ID. Analytics only load in production builds where it's set; leave it empty to disable them. |

AniList needs no key.

### Deploy on Vercel

1. Import the repository in [Vercel](https://vercel.com/new). It detects Astro; no build settings to change.
2. In **Settings → Environment Variables**, add `MAL_CLIENT_ID` (and `UMAMI_WEBSITE_ID` if you use Umami), then deploy.
3. *Optional, to refresh the data every 6 hours*: in **Settings → Git → Deploy Hooks**, create a hook for `main` and save its URL as a GitHub Actions secret named `VERCEL_DEPLOY_HOOK` (**Settings → Secrets and variables → Actions**). The included workflow `.github/workflows/refresh.yml` calls it on a schedule; you can also run it by hand from the **Actions** tab.

If you deploy elsewhere, change `data-domains` in `src/layouts/Layout.astro` to your domain so Umami counts your visits.

Technical notes for contributors are in [AGENTS.md](AGENTS.md).
