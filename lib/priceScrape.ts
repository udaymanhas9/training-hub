// Best-effort, dependency-free price extraction from a product page's HTML.
//
// Tiers, in order of reliability:
//   1. schema.org JSON-LD  (<script type="application/ld+json">) → offers.price
//   2. OpenGraph / itemprop meta tags (product:price:amount, og:price:amount…)
//   3. Optional per-item regex override (price_selector) with a capture group
//
// Works on sites that expose standard price metadata (Shopify and many stores).
// Sites that hard-block bots or render price purely client-side (e.g. Amazon)
// will return null — the UI keeps the manual-edit fallback for those.

export interface ScrapeResult {
  price: number | null;
  source: 'json-ld' | 'meta' | 'regex' | null;
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/122.0 Safari/537.36';

/** Parse a price string like "£1,299.00" or "1.299,00" or "1299" into a number. */
export function parsePriceString(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== 'string') return null;

  // Strip currency symbols/letters, keep digits, separators and sign.
  let s = raw.replace(/[^0-9.,]/g, '').trim();
  if (!s) return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  // Decide the decimal separator by whichever appears last.
  if (lastComma > lastDot) {
    // comma is decimal → drop dot thousands, swap comma to dot
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    // dot is decimal (or none) → drop comma thousands
    s = s.replace(/,/g, '');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

// Recursively hunt for a price inside parsed JSON-LD.
function priceFromJsonLd(node: unknown): number | null {
  if (node === null || typeof node !== 'object') return null;

  if (Array.isArray(node)) {
    for (const el of node) {
      const p = priceFromJsonLd(el);
      if (p !== null) return p;
    }
    return null;
  }

  const obj = node as Record<string, unknown>;

  // offers may be an object or array
  if ('offers' in obj) {
    const p = priceFromJsonLd(obj.offers);
    if (p !== null) return p;
  }
  for (const key of ['price', 'lowPrice', 'highPrice']) {
    if (key in obj) {
      const p = parsePriceString(obj[key]);
      if (p !== null) return p;
    }
  }
  // Walk remaining nested objects
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object') {
      const p = priceFromJsonLd(v);
      if (p !== null) return p;
    }
  }
  return null;
}

function fromJsonLd(html: string): number | null {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const p = priceFromJsonLd(parsed);
      if (p !== null) return p;
    } catch { /* malformed block — skip */ }
  }
  return null;
}

function fromMeta(html: string): number | null {
  const patterns = [
    /<meta[^>]+(?:property|name)=["'](?:product:price:amount|og:price:amount|twitter:data1)["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:product:price:amount|og:price:amount)["']/i,
    /itemprop=["']price["'][^>]*content=["']([^"']+)["']/i,
    /itemprop=["']price["'][^>]*>\s*([^<]+)</i,
  ];
  for (const re of patterns) {
    const m = re.exec(html);
    if (m) {
      const p = parsePriceString(m[1]);
      if (p !== null) return p;
    }
  }
  return null;
}

function fromRegex(html: string, selector: string): number | null {
  try {
    const re = new RegExp(selector, 'i');
    const m = re.exec(html);
    if (m) return parsePriceString(m[1] ?? m[0]);
  } catch { /* invalid regex — ignore */ }
  return null;
}

export async function scrapePrice(url: string, selector?: string | null): Promise<ScrapeResult> {
  let html: string;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
    });
    if (!res.ok) return { price: null, source: null };
    html = await res.text();
  } catch {
    return { price: null, source: null };
  }

  const jsonLd = fromJsonLd(html);
  if (jsonLd !== null) return { price: jsonLd, source: 'json-ld' };

  const meta = fromMeta(html);
  if (meta !== null) return { price: meta, source: 'meta' };

  if (selector) {
    const rx = fromRegex(html, selector);
    if (rx !== null) return { price: rx, source: 'regex' };
  }

  return { price: null, source: null };
}
