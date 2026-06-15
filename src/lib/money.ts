// Shared helpers for parsing dates/amounts out of messy statement text and
// for formatting values in the UI. Kept dependency-free so it's trivially
// unit-testable.

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

/** Zero-pad a number to 2 digits. */
function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Try to parse a date token found in statement text into an ISO date
 * (YYYY-MM-DD). Returns null if it doesn't look like a date.
 *
 * `dayFirst` disambiguates numeric formats like 03/04/2024 (true => DD/MM).
 * Most non-US bank statements are day-first, so it defaults to true but the
 * UI lets the user flip it per import.
 */
export function parseDate(raw: string, dayFirst = true, assumeYear?: number): string | null {
  const s = raw.trim();
  // Many US statements (Chase, Capital One, …) omit the year on each row; fall
  // back to the statement year when known, otherwise the current year.
  const fallbackYear = assumeYear ?? new Date().getFullYear();

  // ISO: 2024-03-09 or 2024/03/09
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) {
    const [, y, mo, d] = m;
    return iso(+y, +mo, +d);
  }

  // Numeric d/m/y or m/d/y with 2- or 4-digit year.
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) {
    return numericDate(+m[1], +m[2], normalizeYear(+m[3]), dayFirst);
  }

  // Numeric with no year: 03/15 or 15/03 — use the fallback year.
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})$/);
  if (m) {
    return numericDate(+m[1], +m[2], fallbackYear, dayFirst);
  }

  // "9 Mar 2024" / "9 March 2024" / "Mar 9, 2024" / "9-Mar-24"
  m = s.match(/^(\d{1,2})[\s-]+([A-Za-z]{3,9})[\s-]+(\d{2,4})$/);
  if (m) {
    const month = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (month) return iso(normalizeYear(+m[3]), month, +m[1]);
  }
  m = s.match(/^([A-Za-z]{3,9})\.?[\s-]+(\d{1,2}),?[\s-]+(\d{2,4})$/);
  if (m) {
    const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (month) return iso(normalizeYear(+m[3]), month, +m[2]);
  }

  // Month-name with no year: "Mar 9" / "9 Mar".
  m = s.match(/^([A-Za-z]{3,9})\.?[\s-]+(\d{1,2})$/);
  if (m) {
    const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (month) return iso(fallbackYear, month, +m[2]);
  }
  m = s.match(/^(\d{1,2})[\s-]+([A-Za-z]{3,9})$/);
  if (m) {
    const month = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (month) return iso(fallbackYear, month, +m[1]);
  }

  return null;
}

/** Resolve a numeric date's day/month order, disambiguating when possible. */
function numericDate(a: number, b: number, year: number, dayFirst: boolean): string | null {
  let day: number;
  let month: number;
  if (a > 12 && b <= 12) {
    day = a;
    month = b;
  } else if (b > 12 && a <= 12) {
    month = a;
    day = b;
  } else {
    day = dayFirst ? a : b;
    month = dayFirst ? b : a;
  }
  return iso(year, month, day);
}

// Finds a date-like token anywhere in a string (handles cells that contain a
// trailing description or a second "posting date" column). The alphabetic
// forms only match real month names so words like "Posted" aren't mistaken.
const MONTH_NAME = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';
const DATE_TOKEN_RE = new RegExp(
  '(' +
    '\\d{4}[-/.]\\d{1,2}[-/.]\\d{1,2}' +
    '|\\d{1,2}[-/.]\\d{1,2}(?:[-/.]\\d{2,4})?' +
    `|\\d{1,2}[\\s-]${MONTH_NAME}(?:[\\s-]\\d{2,4})?` +
    `|${MONTH_NAME}\\s+\\d{1,2}(?:,?\\s+\\d{2,4})?` +
    ')',
  'i',
);

/** Extract and parse the first date found in arbitrary text. */
export function extractDate(text: string, dayFirst = true, assumeYear?: number): string | null {
  const m = text.match(DATE_TOKEN_RE);
  if (!m) return null;
  return parseDate(m[1], dayFirst, assumeYear);
}

function normalizeYear(y: number): number {
  if (y >= 100) return y;
  // 2-digit year: assume 2000s for 00-69, 1900s otherwise.
  return y <= 69 ? 2000 + y : 1900 + y;
}

function iso(y: number, mo: number, d: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

/**
 * Parse a monetary token into a number. Handles thousands separators,
 * currency symbols, parentheses-as-negative, and trailing CR/DR markers.
 * Returns null if there's no parseable number.
 */
export function parseAmount(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;

  let sign = 1;
  if (/^\(.*\)$/.test(s)) sign = -1; // (1,234.56) => negative
  if (/\bdr\b/i.test(s)) sign = -1; // debit marker
  if (/\bcr\b/i.test(s)) sign = 1; // credit marker
  if (/(^|[^\d])-\s*\d/.test(s)) sign = -1; // a minus sign just before a number

  // Pull out every number-like token. Crucially we never concatenate across
  // tokens — a cell that accidentally contains both the amount and the running
  // balance (e.g. "8,305.72 1,000.00") must not become one giant number.
  const tokens = s.match(/\d[\d.,]*\d|\d/g);
  if (!tokens) return null;

  // Prefer a token that looks like money (2-decimal), else the first token —
  // which, when amount+balance share a cell, is the amount (balance is last).
  const moneyToken = tokens.find((t) => /[.,]\d{2}$/.test(t));
  const chosen = moneyToken ?? tokens[0];

  const num = normalizeNumber(chosen);
  if (num === null) return null;
  return sign * Math.abs(num);
}

/**
 * Normalize a number string that may use either "," or "." as the decimal
 * separator (European vs US formatting) plus thousands separators.
 */
function normalizeNumber(cleaned: string): number | null {
  let s = cleaned.replace(/-/g, '');
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma && hasDot) {
    // Whichever appears last is the decimal separator.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Treat comma as decimal only if it looks like one (1-2 trailing digits).
    if (/,\d{1,2}$/.test(s)) s = s.replace(',', '.');
    else s = s.replace(/,/g, '');
  }

  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** Format a number as currency for display. */
export function formatMoney(amount: number, currency = '$'): string {
  const abs = Math.abs(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? '-' : ''}${currency}${abs}`;
}

/** Collapse whitespace and trim — used to clean descriptions. */
export function cleanText(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}
