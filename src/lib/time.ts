// Air times: MAL gives weekday + time in JST (UTC+9, Japan has no daylight saving time).

type Broadcast = { day: string | null; time: string | null };

export const WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']; // MAL's day keys
const HOUR = 3600e3;

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
  d.toLocaleString(locale, { weekday, hour: 'numeric', minute: '2-digit', timeZone: tz });

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

// In the browser: the user's time zone, straight from the system settings
export const localTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

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
