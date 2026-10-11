// Air times: MAL gives weekday + time in JST (UTC+9, Japan has no daylight saving time).

type Broadcast = { day: string | null; time: string | null };

export const WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']; // MAL's day keys
const HOUR = 3600e3;

// User preferences from the settings dialog (Layout.astro), stored in localStorage. Safe at build time: no
// localStorage there, so the defaults apply.
export const pref = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

// Time format: 24-hour by default ("23:30"); "12" in settings gives "11:30 PM"
export const clock = () =>
  pref('clock') === '12'
    ? ({ hour: 'numeric', minute: '2-digit', hourCycle: 'h12' } as const)
    : ({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } as const);

// Air instant in week `offset` relative to the current week in Japan.
// "25:30" (Japanese late-night notation) correctly overflows into the next day.
export function airInstant(b: Broadcast, offset = 0): Date | null {
  if (!b.day || !WEEK.includes(b.day) || !b.time) return null;
  const [h, m] = b.time.split(':').map(Number);
  const jst = new Date(Date.now() + 9 * HOUR);
  const diff = WEEK.indexOf(b.day) - jst.getUTCDay() + 7 * offset;
  return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate() + diff, h - 9, m));
}

// YYYY-MM-DD date in a time zone
export const dateIn = (d: Date, tz: string) => d.toLocaleDateString('en-CA', { timeZone: tz });

export const timeIn = (d: Date, tz: string, locale: string, weekday?: 'short' | 'long') =>
  d.toLocaleString(locale, { weekday, ...clock(), timeZone: tz });

// Local weekday and time of the weekly broadcast (uses the current week so the current DST offset applies)
export function localSlot(b: Broadcast, tz: string, locale: string) {
  const d = airInstant(b);
  if (!d) return null;
  return {
    day: d.toLocaleString('en-US', { weekday: 'long', timeZone: tz }).toLowerCase(),
    short: timeIn(d, tz, locale, 'short'),
    long: timeIn(d, tz, locale, 'long'),
  };
}

// The broadcast that falls today (in time zone `tz`), if any
export function airingToday(b: Broadcast, tz: string, now = new Date()) {
  const today = dateIn(now, tz);
  for (const offset of [-1, 0, 1]) {
    const d = airInstant(b, offset);
    if (d && dateIn(d, tz) === today) return d;
  }
  return null;
}

export const browserTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

// In the browser: the time zone chosen in settings, or the system one ("Automatic", the default)
export function localTz() {
  const tz = pref('tz');
  if (!tz) return browserTz();
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz }); // a stored zone the browser no longer knows falls back
    return tz;
  } catch {
    return browserTz();
  }
}

// Localized weekday name for a MAL day key ("monday" → "Monday" in en, "lunes" in es)
export const weekdayName = (day: string, locale: string, style: 'long' | 'short' = 'long') =>
  new Date(Date.UTC(2024, 0, 7 + WEEK.indexOf(day))).toLocaleString(locale, { weekday: style, timeZone: 'UTC' }); // 2024-01-07 was a Sunday

// Original broadcast slot in Japan time, e.g. "Saturday 11:30 PM JST"
export function jstSlot(b: Broadcast, locale: string) {
  const d = airInstant(b);
  return d && `${timeIn(d, 'Asia/Tokyo', locale, 'long')} JST`;
}

// Premiere date; MAL sometimes only knows the month ("2026-10") or the year
export function formatDate(iso: string, locale: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  const opts: Intl.DateTimeFormatOptions = d ? { dateStyle: 'medium' } : m ? { year: 'numeric', month: 'long' } : { year: 'numeric' };
  return date.toLocaleDateString(locale, { ...opts, timeZone: 'UTC' });
}

// "Newest" order: premiered shows newest first, then upcoming ones soonest first, then those without a date.
// ISO dates compare correctly as text, also partial ones ("2026-10"). Used at build time and in the browser,
// so the server-rendered list already matches the default sort and nothing jumps on load.
export function newestFirst(a: { from: string | null }, b: { from: string | null }, today = new Date().toISOString().slice(0, 10)) {
  const group = (from: string | null) => (!from ? 2 : from.slice(0, 10) <= today ? 0 : 1);
  const ga = group(a.from), gb = group(b.from);
  return ga - gb || (ga === 0 ? b.from!.localeCompare(a.from!) : (a.from ?? '').localeCompare(b.from ?? ''));
}

// Today's broadcast in time zone `tz`: AniList's exact episode schedule when it knows the show (an empty list
// means a week off), otherwise MAL's weekly slot without an episode number. Shared by / (TODAY tag) and /today.
export function todaysEpisode(
  a: Broadcast & { airings: [number, number][] | null; from: string | null },
  tz: string,
  now = new Date()
): { at: Date; ep?: number } | null {
  if (a.airings) {
    const today = dateIn(now, tz);
    const hit = a.airings.find(([, at]) => dateIn(new Date(at * 1000), tz) === today);
    return hit ? { at: new Date(hit[1] * 1000), ep: hit[0] } : null;
  }
  const at = airingToday(a, tz, now);
  // not premiered yet (from is the premiere date in Japan)
  const jstDate = at && new Date(at.getTime() + 9 * 3600e3).toISOString().slice(0, 10);
  return at && (!a.from || jstDate! >= a.from.slice(0, 10)) ? { at } : null;
}
