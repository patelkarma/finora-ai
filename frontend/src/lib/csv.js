/**
 * Tiny CSV parser. Hand-rolled rather than pulling in PapaParse — the
 * import flow only needs RFC 4180 basics (quoted fields, embedded
 * commas, escaped quotes, \r\n) and ~80 lines stays out of the bundle.
 *
 * Returns { headers: string[], rows: Record<string,string>[] }.
 */
export function parseCsv(text) {
  // Strip a UTF-8 BOM if Excel left one in.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const out = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      // Treat \r, \n, and \r\n as one line break.
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      out.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  // Final field — only push the row if anything is in it.
  if (field !== '' || row.length > 0) {
    row.push(field);
    out.push(row);
  }

  if (out.length === 0) return { headers: [], rows: [] };
  const headers = out[0].map((h) => h.trim().toLowerCase());

  const rows = [];
  for (let i = 1; i < out.length; i++) {
    const r = out[i];
    // Skip fully blank trailing rows that some editors leave behind.
    if (r.length === 1 && r[0].trim() === '') continue;
    const obj = {};
    headers.forEach((h, j) => {
      obj[h] = (r[j] ?? '').trim();
    });
    rows.push(obj);
  }
  return { headers, rows };
}

// Common header aliases — accept the format the user actually has
// rather than forcing them to rename columns. Maps source header (lower-
// case, trimmed) to our canonical key.
const HEADER_ALIASES = {
  date: 'date',
  'transaction date': 'date',
  'transaction_date': 'date',
  'txn date': 'date',
  'txn_date': 'date',
  posted: 'date',
  'posted date': 'date',
  description: 'description',
  desc: 'description',
  details: 'description',
  narration: 'description',
  memo: 'description',
  category: 'category',
  cat: 'category',
  amount: 'amount',
  amt: 'amount',
  value: 'amount',
  debit: 'debit',
  credit: 'credit',
  type: 'type',
  direction: 'type',
};

/**
 * Normalize a parsed CSV into ImportRow shape. Accepts:
 *   - A single `amount` column (positive number) + a `type` column.
 *   - Separate `debit` / `credit` columns (common in bank statements).
 *   - A signed `amount` column with no `type` (negative => expense).
 *
 * Date parsing accepts:
 *   - YYYY-MM-DD
 *   - DD/MM/YYYY  (Indian banks)
 *   - MM/DD/YYYY  (US banks) — only when day > 12 makes it unambiguous
 *
 * Returns { rows: ImportRow[], errors: {row, message}[] }. `row` is the
 * 1-indexed source row number (header is row 1).
 */
export function normalizeRows(parsed) {
  const headerMap = {};
  parsed.headers.forEach((h) => {
    const key = HEADER_ALIASES[h];
    if (key) headerMap[key] = h;
  });

  if (!headerMap.date) return { rows: [], errors: [{ row: 0, message: 'Missing "date" column' }] };
  if (!headerMap.amount && !(headerMap.debit && headerMap.credit)) {
    return { rows: [], errors: [{ row: 0, message: 'Missing "amount" column (or "debit" + "credit")' }] };
  }

  const rows = [];
  const errors = [];

  parsed.rows.forEach((src, idx) => {
    const lineNumber = idx + 2; // +2: header is line 1, data starts at 2

    const dateRaw = src[headerMap.date];
    const date = parseDate(dateRaw);
    if (!date) {
      errors.push({ row: lineNumber, message: `Could not parse date "${dateRaw}"` });
      return;
    }

    let amount;
    let type;
    if (headerMap.debit || headerMap.credit) {
      const debit = parseAmount(src[headerMap.debit]);
      const credit = parseAmount(src[headerMap.credit]);
      if (debit > 0) {
        amount = debit;
        type = 'expense';
      } else if (credit > 0) {
        amount = credit;
        type = 'income';
      } else {
        errors.push({ row: lineNumber, message: 'Both debit and credit are 0' });
        return;
      }
    } else {
      const raw = parseAmount(src[headerMap.amount]);
      if (!Number.isFinite(raw) || raw === 0) {
        errors.push({ row: lineNumber, message: `Invalid amount "${src[headerMap.amount]}"` });
        return;
      }
      // type column wins; otherwise sign determines it.
      const typeRaw = headerMap.type ? src[headerMap.type]?.toLowerCase() : '';
      if (typeRaw === 'income' || typeRaw === 'credit' || typeRaw === 'cr') type = 'income';
      else if (typeRaw === 'expense' || typeRaw === 'debit' || typeRaw === 'dr') type = 'expense';
      else type = raw < 0 ? 'expense' : 'income';
      amount = Math.abs(raw);
    }

    const description = headerMap.description ? src[headerMap.description] || '' : '';
    const category = (headerMap.category ? src[headerMap.category] : '').trim() || guessCategory(description, type);

    rows.push({
      date,
      description: description.slice(0, 255),
      category: category.slice(0, 50),
      amount: Number(amount.toFixed(2)),
      type,
    });
  });

  return { rows, errors };
}

function parseAmount(raw) {
  if (raw == null) return 0;
  // Strip currency symbols, thousands separators, parens (accounting
  // negatives), trailing CR/DR markers.
  let s = String(raw).trim();
  if (!s) return 0;
  let negative = false;
  if (s.startsWith('(') && s.endsWith(')')) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (/CR$/i.test(s)) s = s.replace(/CR$/i, '').trim();
  if (/DR$/i.test(s)) {
    negative = true;
    s = s.replace(/DR$/i, '').trim();
  }
  s = s.replace(/[₹$€£,]/g, '').trim();
  const n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  return negative ? -n : n;
}

function parseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();

  // YYYY-MM-DD (ISO)
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return iso(m[1], m[2], m[3]);

  // YYYY/MM/DD
  m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (m) return iso(m[1], m[2], m[3]);

  // DD/MM/YYYY or DD-MM-YYYY (default — Indian banks). Fall back to
  // MM/DD/YYYY only if first part > 12.
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    if (a > 12) return iso(m[3], b, a);          // unambiguous DD/MM
    if (b > 12) return iso(m[3], a, b);          // unambiguous MM/DD
    return iso(m[3], b, a);                      // ambiguous → assume DD/MM
  }

  return null;
}

function iso(y, m, d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${y}-${pad(m)}-${pad(d)}`;
}

function guessCategory(description, type) {
  if (type === 'income') return 'Income';
  const d = (description || '').toLowerCase();
  if (/swiggy|zomato|uber\s?eats|dominos|mcd|kfc|pizza|cafe|coffee|starbucks/.test(d)) return 'Food';
  if (/uber|ola|rapido|metro|petrol|fuel|diesel/.test(d)) return 'Transport';
  if (/amazon|flipkart|myntra|ajio/.test(d)) return 'Shopping';
  if (/netflix|spotify|prime|hotstar|disney/.test(d)) return 'Subscriptions';
  if (/rent|electricity|water|gas|wifi|broadband/.test(d)) return 'Bills';
  return 'Other';
}

/**
 * Sample CSV string used for the "download sample" link in the import
 * modal. Kept tiny on purpose so users can see the expected shape and
 * tweak rather than guess.
 */
export const SAMPLE_CSV = `date,description,category,amount,type
2026-04-01,Salary - April,Salary,52000,income
2026-04-02,Big Bazaar weekly,Groceries,2150.50,expense
2026-04-03,Uber to office,Transport,180,expense
2026-04-04,Netflix,Subscriptions,649,expense
2026-04-05,Coffee with team,Food,420,expense
`;
