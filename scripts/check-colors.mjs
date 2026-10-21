// Fails on hex / rgb(a) literals outside styles/theme.css and lib/theme.ts, and on
// token drift between theme.css and lib/theme.ts.  Usage: node scripts/check-colors.mjs [--warn]
import fs from 'node:fs';
import path from 'node:path';

const warn = process.argv.includes('--warn');
const ALLOW = new Set([
  'styles/theme.css', 'lib/theme.ts',
  'lib/defaultData.ts',          // seed data stored in DB — migrates to slots in Phase 3
]);
const COLOR = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b|\brgba?\(\s*\d/g;
const problems = [];

function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx?|css)$/.test(e.name) && !ALLOW.has(p)) scan(p);
  }
}
function scan(p) {
  fs.readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
    const m = line.match(COLOR);
    if (m) problems.push(`${p}:${i + 1}  ${m.join(' ')}`);
  });
}
['app', 'components', 'lib'].forEach(walk);

// theme.css ↔ theme.ts sync (semantic tokens used by `c`)
const css = fs.readFileSync('styles/theme.css', 'utf8');
const ts = fs.readFileSync('lib/theme.ts', 'utf8');
const cssTokens = new Set([...css.matchAll(/(?:^|[\s;{])--([a-z0-9-]+):/gm)].map(m => m[1]));
const tsTokens = [...ts.matchAll(/v\('([a-z0-9-]+)'\)/g)].map(m => m[1]);
for (const t of tsTokens) if (!cssTokens.has(t)) problems.push(`lib/theme.ts references --${t} missing from theme.css`);
const PRIMITIVE = /-rgb$|^(neutral|slate|red|rose|green|blue|amber|orange|violet|indigo|cyan|pink|gold)-\d|^(brand|blog)-|^(ink|shadow)|^chart-/;
const tsSet = new Set(tsTokens);
for (const t of cssTokens) if (!PRIMITIVE.test(t) && !tsSet.has(t)) problems.push(`theme.css defines --${t} missing from lib/theme.ts`);

if (problems.length) {
  console.log(problems.join('\n'));
  console.log(`\n${problems.length} colour problem(s)${warn ? ' (warn-only)' : ''}`);
  process.exit(warn ? 0 : 1);
}
console.log('colours OK');
