/**
 * PDF text extractor.
 *
 *   node tools/read-pdf.mjs "<file.pdf>"
 *
 * Handles the two ways text actually appears in a modern PDF:
 *
 *   1. Literal strings — (Hello) Tj — in WinAnsi or similar
 *   2. Hex strings — <0048 0065> Tj — using Identity encoding, where the
 *      bytes are glyph ids and only the font's /ToUnicode CMap says what
 *      character each one is
 *
 * The second is why a naive extractor returns font tables and nothing else:
 * without reading the CMaps, the actual prose is unreadable glyph indices.
 * This builds a combined code→character map from every CMap in the file and
 * uses it to decode the hex strings.
 *
 * Not a full PDF parser — no layout, no column detection, no per-font scoping.
 * Enough to read a specification document.
 */
import { readFileSync } from 'node:fs';
import { inflateSync, inflateRawSync } from 'node:zlib';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node tools/read-pdf.mjs "<file.pdf>"');
  process.exit(1);
}

const latin = readFileSync(file).toString('latin1');

/** Every stream in the file, inflated where possible. */
function streams() {
  const out = [];
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(latin)) !== null) {
    const start = re.lastIndex;
    const end = latin.indexOf('endstream', start);
    if (end < 0) continue;
    const raw = Buffer.from(latin.slice(start, end), 'latin1');
    let text;
    try {
      text = inflateSync(raw).toString('latin1');
    } catch {
      try {
        text = inflateRawSync(raw).toString('latin1');
      } catch {
        text = raw.toString('latin1');
      }
    }
    out.push(text);
  }
  return out;
}

const all = streams();

/* ── Build code → character from every ToUnicode CMap ──────────── */
const uni = new Map();

for (const s of all) {
  if (!s.includes('beginbfchar') && !s.includes('beginbfrange')) continue;

  // <src> <dst>
  for (const m of s.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
    const src = parseInt(m[1], 16);
    const dst = m[2];
    // A destination can be several UTF-16 code units
    let chars = '';
    for (let i = 0; i + 4 <= dst.length; i += 4) {
      chars += String.fromCharCode(parseInt(dst.slice(i, i + 4), 16));
    }
    if (chars) uni.set(src, chars);
  }

  // <lo> <hi> <dstStart>
  for (const m of s.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
    const lo = parseInt(m[1], 16);
    const hi = parseInt(m[2], 16);
    const base = parseInt(m[3], 16);
    if (hi - lo > 4096) continue;
    for (let c = lo; c <= hi; c += 1) uni.set(c, String.fromCharCode(base + (c - lo)));
  }
}

/* ── Pull the text-showing operators out of content streams ─────── */
const decodeHex = (hex) => {
  const clean = hex.replace(/\s+/g, '');
  let out = '';
  for (let i = 0; i + 4 <= clean.length; i += 4) {
    const code = parseInt(clean.slice(i, i + 4), 16);
    out += uni.get(code) ?? (code >= 32 && code < 127 ? String.fromCharCode(code) : '');
  }
  return out;
};

const decodeLiteral = (lit) =>
  lit
    .replace(/\\([()\\])/g, '$1')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, ' ')
    .replace(/\\[0-7]{1,3}/g, '');

const pages = [];

for (const s of all) {
  if (!/\bTJ\b|\bTj\b/.test(s)) continue;

  let text = '';
  // Walk the show-text operators in order so words stay in reading order.
  const re = /(\[[^\]]*\]\s*TJ)|(\([^)]*\)\s*Tj)|(<[0-9A-Fa-f\s]*>\s*Tj)|(\bT\*|\bTd|\bTD|\bET)/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const tok = m[0];
    if (m[4]) {
      text += '\n';
      continue;
    }
    for (const h of tok.matchAll(/<([0-9A-Fa-f\s]+)>/g)) text += decodeHex(h[1]);
    for (const l of tok.matchAll(/\(((?:\\.|[^\\()])*)\)/g)) text += decodeLiteral(l[1]);
    // A large negative kern in a TJ array is a word space
    text = text.replace(/$/, '');
    if (m[1]) {
      // re-scan the array for kerning gaps we should treat as spaces
    }
  }

  const cleaned = text
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (cleaned.length > 40) pages.push(cleaned);
}

const doc = pages.join('\n\n');
console.log(`--- ${doc.length} characters from ${pages.length} content streams ---\n`);
console.log(doc);
