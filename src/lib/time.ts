// Air times: Jikan gives weekday + time in JST (UTC+9, Japan has no daylight saving time).

type Broadcast = { day: string | null; time: string | null };

export const WEEK = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
const HOUR = 3600e3;

// The time zone is what matters for air times; the country is just the flag label.
// Country names come from Intl.DisplayNames, so they follow the page locale.
// ponytail: short list; any other browser time zone is added automatically as "🌐 <city>"
export const ZONES: [country: string, tz: string][] = [
  ['US', 'America/New_York'], ['US', 'America/Chicago'], ['US', 'America/Denver'], ['US', 'America/Los_Angeles'],
  ['CA', 'America/Toronto'], ['CA', 'America/Vancouver'], ['MX', 'America/Mexico_City'], ['BR', 'America/Sao_Paulo'],
  ['AR', 'America/Argentina/Buenos_Aires'], ['CL', 'America/Santiago'], ['CO', 'America/Bogota'], ['PE', 'America/Lima'],
  ['GB', 'Europe/London'], ['IE', 'Europe/Dublin'], ['PT', 'Europe/Lisbon'], ['ES', 'Europe/Madrid'],
  ['FR', 'Europe/Paris'], ['DE', 'Europe/Berlin'], ['IT', 'Europe/Rome'], ['NL', 'Europe/Amsterdam'],
  ['PL', 'Europe/Warsaw'], ['IN', 'Asia/Kolkata'], ['ID', 'Asia/Jakarta'], ['PH', 'Asia/Manila'],
  ['SG', 'Asia/Singapore'], ['KR', 'Asia/Seoul'], ['JP', 'Asia/Tokyo'], ['AU', 'Australia/Sydney'],
  ['NZ', 'Pacific/Auckland'],
];

export const city = (tz: string) => tz.split('/').pop()!.replaceAll('_', ' ');

// Selector options: "🇺🇸 United States (New York)" when a country has several zones, else "🇪🇸 Spain"
export function zoneOptions(locale: string) {
  const names = new Intl.DisplayNames([locale], { type: 'region' });
  return ZONES.map(([cc, tz]) => {
    const multi = ZONES.filter(([c]) => c === cc).length > 1;
    return { tz, label: `${flag(cc)} ${names.of(cc)}${multi ? ` (${city(tz)})` : ''}` };
  });
}
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

export const timeIn = (d: Date, tz: string, locale: string, weekday?: 'short' | 'long') =>
  d.toLocaleString(locale, { weekday, hour: 'numeric', minute: '2-digit', timeZone: tz });

// Local weekday and time of the weekly broadcast (uses the current week so the current DST offset applies)
export function localSlot(b: Broadcast, tz: string, locale: string) {
  const d = airInstant(b);
  if (!d) return null;
  return {
    day: d.toLocaleString('en-US', { weekday: 'long', timeZone: tz }) + 's',
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

// In the browser: the time zone picked in the header selector (Layout.astro)
export const currentTz = () => (document.getElementById('tz') as HTMLSelectElement | null)?.value || getTz();

// Localized weekday name for a Jikan day key ("Mondays" → "Monday" in en, "lunes" in es)
export const weekdayName = (day: string, locale: string) =>
  new Date(Date.UTC(2024, 0, 7 + WEEK.indexOf(day))).toLocaleString(locale, { weekday: 'long', timeZone: 'UTC' }); // 2024-01-07 was a Sunday
