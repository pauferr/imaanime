// Air times: Jikan gives weekday + time in JST (UTC+9, Japan has no daylight saving time).

type Broadcast = { day: string | null; time: string | null };

export const WEEK = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
const HOUR = 3600e3;

// The time zone is what matters for air times; the country is just the flag label.
// ponytail: short list; any other browser time zone is added automatically as "🌐 <city>"
export const ZONES: [string, string, string][] = [
  ['US', 'United States (Eastern)', 'America/New_York'], ['US', 'United States (Central)', 'America/Chicago'],
  ['US', 'United States (Mountain)', 'America/Denver'], ['US', 'United States (Pacific)', 'America/Los_Angeles'],
  ['CA', 'Canada (Toronto)', 'America/Toronto'], ['CA', 'Canada (Vancouver)', 'America/Vancouver'],
  ['MX', 'Mexico', 'America/Mexico_City'], ['BR', 'Brazil', 'America/Sao_Paulo'], ['AR', 'Argentina', 'America/Argentina/Buenos_Aires'],
  ['CL', 'Chile', 'America/Santiago'], ['CO', 'Colombia', 'America/Bogota'], ['PE', 'Peru', 'America/Lima'],
  ['GB', 'United Kingdom', 'Europe/London'], ['IE', 'Ireland', 'Europe/Dublin'], ['PT', 'Portugal', 'Europe/Lisbon'],
  ['ES', 'Spain', 'Europe/Madrid'], ['FR', 'France', 'Europe/Paris'], ['DE', 'Germany', 'Europe/Berlin'],
  ['IT', 'Italy', 'Europe/Rome'], ['NL', 'Netherlands', 'Europe/Amsterdam'], ['PL', 'Poland', 'Europe/Warsaw'],
  ['IN', 'India', 'Asia/Kolkata'], ['ID', 'Indonesia (Jakarta)', 'Asia/Jakarta'], ['PH', 'Philippines', 'Asia/Manila'],
  ['SG', 'Singapore', 'Asia/Singapore'], ['KR', 'South Korea', 'Asia/Seoul'], ['JP', 'Japan', 'Asia/Tokyo'],
  ['AU', 'Australia (Sydney)', 'Australia/Sydney'], ['NZ', 'New Zealand', 'Pacific/Auckland'],
]
export const flag = (cc: string) => String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0)));

// Time zone saved by the user or, if none was chosen, the browser's
export function getTz(): string {
  try {
    const saved = localStorage.getItem('tz');
    if (saved) return saved;
  } catch {}
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

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

export const timeIn = (d: Date, tz: string, weekday?: 'short' | 'long') =>
  d.toLocaleString('en', { weekday, hour: 'numeric', minute: '2-digit', timeZone: tz });

// Local weekday and time of the weekly broadcast (uses the current week so the current DST offset applies)
export function localSlot(b: Broadcast, tz: string) {
  const d = airInstant(b);
  if (!d) return null;
  return {
    day: d.toLocaleString('en-US', { weekday: 'long', timeZone: tz }) + 's',
    short: timeIn(d, tz, 'short'),
    long: timeIn(d, tz, 'long'),
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

// In the browser: the time zone picked in the header selector (Layout.astro)
export const currentTz = () => (document.getElementById('tz') as HTMLSelectElement | null)?.value || getTz();
