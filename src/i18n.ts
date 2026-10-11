// UI strings and locale helpers. To add a language: add its dictionary to `ui` (TypeScript
// flags any missing key) and pages are generated under /<locale>/ automatically.
// Dates, times, numbers, weekdays and country names come from Intl, so they need no strings here.

const en = {
  seasons: { winter: 'Winter', spring: 'Spring', summer: 'Summer', fall: 'Fall' } as Record<string, string>,
  currentSeason: 'Current season',
  nav: { season: 'Season', today: 'Today' },
  titles: { label: 'Title language', romaji: 'Romaji', english: 'English' },
  index: {
    description: (season: string) => `Anime airing now: ${season}`,
    subtitle: (season: string) => `Airing now · ${season}`,
    search: 'Search by title…  ( / )',
    searchLabel: 'Search by title',
    day: 'Air day',
    anyDay: 'Any day',
    sort: 'Sort by',
    sortNew: 'Newest',
    sortScore: 'Top rated',
    sortVotes: 'Most popular',
    sortName: 'Title A–Z',
    genres: 'Genres',
    filters: 'Filters',
    tabs: { label: 'Show', new: 'New', continuing: 'Continuing', all: 'All' },
    clear: 'Clear filters',
    empty: 'No anime matches these filters.',
    count: (n: number, total: number) => `${n} of ${total} anime`,
    voters: (n: string) => `${n} MAL users scored it`,
  },
  today: {
    title: 'Today',
    description: (season: string) => `Anime airing today · ${season}`,
    subtitle: (season: string) => `Airing today · ${season}`,
    heading: (date: string) => `Today, ${date}`,
    empty: 'No anime from this season airs today.',
    aired: '✓ Aired',
    // "S03E05" when the season is known, "E05" otherwise
    episode: (n: number, season?: number | null) =>
      `${season ? `S${String(season).padStart(2, '0')}` : ''}E${String(n).padStart(2, '0')}`,
  },
  modal: {
    close: 'Close',
    episodes: 'Episodes',
    format: 'Format',
    episodesOf: (aired: number, total: number | string) => `${aired} of ${total}`,
    next: 'Next episode',
    prequel: 'Previous season',
    sequel: 'Next season',
    studio: 'Studio',
    aired: 'Aired',
    broadcast: 'Broadcast',
    viewOnMal: 'View on MyAnimeList →',
    votes: (n: string) => `(${n} votes on MAL)`,
    yourTime: '(your time)',
  },
  // format of the release (MAL media_type): short card tag (none for regular TV series) and modal label
  formats: {
    tag: { ona: 'ONA', ova: 'OVA', tv_special: 'Special', special: 'Special', movie: 'Movie', tv: '', tv_short: '' } as Record<string, string>,
    name: { tv: 'TV series', tv_short: 'TV short', ona: 'Web series (ONA)', ova: 'OVA', tv_special: 'TV special', special: 'Special', movie: 'Movie' } as Record<string, string>,
  },
  // card tags: shows that start this season vs. ones that started in an earlier season
  isNew: 'New',
  continuing: 'Continuing',
  noSynopsis: 'No synopsis yet.',
  unknown: 'Unknown',
};

export type Dict = typeof en;
export const ui = { en } satisfies Record<string, Dict>;
export type Locale = keyof typeof ui;
export const LOCALES = Object.keys(ui) as Locale[];
export const DEFAULT_LOCALE: Locale = 'en';

// getStaticPaths for pages under src/pages/[...locale]/: the default locale lives at the root
export const localePaths = () =>
  LOCALES.map((locale) => ({ params: { locale: locale === DEFAULT_LOCALE ? undefined : locale } }));

export const localeOf = (param: string | undefined) => (param ?? DEFAULT_LOCALE) as Locale;

// "/" or "/today" in the default locale, "/es/" or "/es/today" in others
export const localeUrl = (locale: Locale, path = '') => `${locale === DEFAULT_LOCALE ? '' : `/${locale}`}/${path}`;

// In the browser: the page locale comes from <html lang>
export const pageLocale = () => document.documentElement.lang as Locale;

export const seasonLabel = (t: Dict, s: { season: string; year: number | string }) =>
  s.season ? `${t.seasons[s.season] ?? s.season} ${s.year}` : t.currentSeason;
