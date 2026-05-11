// Minimal iCalendar (RFC 5545) helpers — emit valid VCALENDAR / VEVENT bodies.
// Lines are joined with CRLF; folding lifts long lines to <=75 octets to stay
// strictly compliant with parsers that enforce it (Apple Calendar is strict).

export interface IcsEvent {
  uid: string;
  start: string; // YYYYMMDDTHHMMSSZ
  end: string; // YYYYMMDDTHHMMSSZ
  summary: string;
  description: string;
  url?: string;
  location?: string;
  rrule?: string; // e.g. FREQ=WEEKLY;BYDAY=SU
}

export function escapeIcsText(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/\r\n/g, '\\n')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

// Fold any single line longer than 75 octets per RFC 5545 §3.1 — continuation
// lines start with a single space. We measure octets in UTF-8 to avoid splitting
// a multi-byte sequence mid-character.
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  const bytes = enc.encode(line);
  if (bytes.length <= 75) return line;

  const out: string[] = [];
  let cursor = 0;
  while (cursor < bytes.length) {
    const limit = cursor === 0 ? 75 : 74; // continuation lines reserve 1 for leading space
    let chunkEnd = Math.min(cursor + limit, bytes.length);

    // Backtrack to a UTF-8 boundary if we landed inside a continuation byte
    if (chunkEnd < bytes.length) {
      while (chunkEnd > cursor && (bytes[chunkEnd] & 0xc0) === 0x80) chunkEnd--;
    }
    const slice = bytes.subarray(cursor, chunkEnd);
    const chunk = new TextDecoder().decode(slice);
    out.push(cursor === 0 ? chunk : ` ${chunk}`);
    cursor = chunkEnd;
  }
  return out.join('\r\n');
}

export function toIcsDateTime(isoDate: string, hhmmss = '235900'): string {
  // isoDate may be 'YYYY-MM-DD' OR an Astro-coerced Date toString.
  const d = new Date(isoDate);
  const ymd = Number.isNaN(d.getTime())
    ? isoDate.replace(/-/g, '').slice(0, 8)
    : `${d.getUTCFullYear().toString().padStart(4, '0')}${(d.getUTCMonth() + 1)
        .toString()
        .padStart(2, '0')}${d.getUTCDate().toString().padStart(2, '0')}`;
  return `${ymd}T${hhmmss}Z`;
}

export function nowIcsStamp(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

export function renderEvent(ev: IcsEvent, dtstamp: string): string {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${ev.uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${ev.start}`,
    `DTEND:${ev.end}`,
    `SUMMARY:${escapeIcsText(ev.summary)}`,
    `DESCRIPTION:${escapeIcsText(ev.description)}`,
  ];
  if (ev.location) lines.push(`LOCATION:${escapeIcsText(ev.location)}`);
  if (ev.url) lines.push(`URL:${ev.url}`);
  if (ev.rrule) lines.push(`RRULE:${ev.rrule}`);
  lines.push('TRANSP:TRANSPARENT');
  lines.push('STATUS:CONFIRMED');
  lines.push('END:VEVENT');
  return lines.map(foldLine).join('\r\n');
}

export function renderCalendar(opts: {
  prodId: string;
  name: string;
  description: string;
  events: IcsEvent[];
}): string {
  const dtstamp = nowIcsStamp();
  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${opts.prodId}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(opts.name)}`,
    `X-WR-CALDESC:${escapeIcsText(opts.description)}`,
    'X-WR-TIMEZONE:UTC',
    'REFRESH-INTERVAL;VALUE=DURATION:P1D',
    'X-PUBLISHED-TTL:PT24H',
  ].map(foldLine);

  const body = opts.events.map((ev) => renderEvent(ev, dtstamp));
  return [...header, ...body, 'END:VCALENDAR', ''].join('\r\n');
}
