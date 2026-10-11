// Horarios: Jikan da día + hora de emisión en JST (UTC+9, Japón no tiene horario de verano).

type Broadcast = { day: string | null; time: string | null };

export const WEEK = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
const HOUR = 3600e3;

// Lo que importa para los horarios es la zona horaria; el país es solo la etiqueta con bandera.
// ponytail: lista corta; si el navegador tiene otra zona, se añade sola como "🌐 <ciudad>"
export const ZONES: [string, string, string][] = [
  ['ES', 'España', 'Europe/Madrid'], ['ES', 'Canarias', 'Atlantic/Canary'], ['PT', 'Portugal', 'Europe/Lisbon'],
  ['GB', 'Reino Unido', 'Europe/London'], ['FR', 'Francia', 'Europe/Paris'], ['DE', 'Alemania', 'Europe/Berlin'],
  ['IT', 'Italia', 'Europe/Rome'], ['MX', 'México', 'America/Mexico_City'], ['GT', 'Guatemala', 'America/Guatemala'],
  ['CR', 'Costa Rica', 'America/Costa_Rica'], ['CU', 'Cuba', 'America/Havana'], ['DO', 'Rep. Dominicana', 'America/Santo_Domingo'],
  ['PR', 'Puerto Rico', 'America/Puerto_Rico'], ['CO', 'Colombia', 'America/Bogota'], ['VE', 'Venezuela', 'America/Caracas'],
  ['EC', 'Ecuador', 'America/Guayaquil'], ['PE', 'Perú', 'America/Lima'], ['BO', 'Bolivia', 'America/La_Paz'],
  ['CL', 'Chile', 'America/Santiago'], ['AR', 'Argentina', 'America/Argentina/Buenos_Aires'],
  ['UY', 'Uruguay', 'America/Montevideo'], ['PY', 'Paraguay', 'America/Asuncion'], ['BR', 'Brasil', 'America/Sao_Paulo'],
  ['US', 'EE. UU. (Este)', 'America/New_York'], ['US', 'EE. UU. (Centro)', 'America/Chicago'],
  ['US', 'EE. UU. (Montaña)', 'America/Denver'], ['US', 'EE. UU. (Pacífico)', 'America/Los_Angeles'],
  ['JP', 'Japón', 'Asia/Tokyo'], ['PH', 'Filipinas', 'Asia/Manila'], ['AU', 'Australia (Sídney)', 'Australia/Sydney'],
];
export const flag = (cc: string) => String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0)));

// Zona guardada por el usuario o, si no eligió ninguna, la del navegador
export function getTz(): string {
  try {
    const saved = localStorage.getItem('tz');
    if (saved) return saved;
  } catch {}
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Instante de emisión en la semana `offset` respecto a la semana actual de Japón.
// "25:30" (madrugada japonesa) se desborda bien al día siguiente.
export function airInstant(b: Broadcast, offset = 0): Date | null {
  if (!b.day || !WEEK.includes(b.day) || !b.time) return null;
  const [h, m] = b.time.split(':').map(Number);
  const jst = new Date(Date.now() + 9 * HOUR);
  const diff = WEEK.indexOf(b.day) - jst.getUTCDay() + 7 * offset;
  return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate() + diff, h - 9, m));
}

// Fecha YYYY-MM-DD en una zona horaria
export const dateIn = (d: Date, tz: string) => d.toLocaleDateString('en-CA', { timeZone: tz });

export const timeIn = (d: Date, tz: string, weekday?: 'short' | 'long') =>
  d.toLocaleString('es', { weekday, hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz });

// Día y hora local de la emisión semanal (la semana actual se usa para que el horario de verano sea el vigente)
export function localSlot(b: Broadcast, tz: string) {
  const d = airInstant(b);
  if (!d) return null;
  return {
    day: d.toLocaleString('en-US', { weekday: 'long', timeZone: tz }) + 's',
    short: timeIn(d, tz, 'short'),
    long: timeIn(d, tz, 'long'),
  };
}

// La emisión que cae hoy (en la zona `tz`), si la hay
export function airingToday(b: Broadcast, tz: string, now = new Date()) {
  const today = dateIn(now, tz);
  for (const offset of [-1, 0, 1]) {
    const d = airInstant(b, offset);
    if (d && dateIn(d, tz) === today) return d;
  }
  return null;
}

// En el navegador: la zona elegida en el selector de la cabecera (Layout.astro)
export const currentTz = () => (document.getElementById('tz') as HTMLSelectElement | null)?.value || getTz();
