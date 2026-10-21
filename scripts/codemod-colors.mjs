// One-off: rewrite hex / rgba literals to theme tokens. Usage: node scripts/codemod-colors.mjs [--dry] files…
import fs from 'node:fs';

const HEX = {
  '#0a0a0a': 'bg', '#0d0d0d': 'surface', '#0f0f0f': 'surface-1', '#111111': 'surface-2',
  '#161616': 'surface-3', '#1a1a1a': 'surface-4', '#222222': 'surface-5', '#1e293b': 'surface-blue',
  '#1e1e1e': 'border', '#2a2a2a': 'border-strong',
  '#ffffff': 'text-strong', '#f1f5f9': 'text', '#e5e5e5': 'text-soft', '#cbd5e1': 'text-soft-2',
  '#94a3b8': 'text-muted', '#64748b': 'text-subtle', '#475569': 'text-faint', '#334155': 'text-ghost',
  '#737373': 'text-neutral', '#4a4a4a': 'text-neutral-faint', '#555555': 'text-neutral-dim',
  '#888888': 'text-neutral-mid', '#666666': 'text-neutral-low', '#444444': 'text-neutral-ghost',
  '#000000': 'scrim',
  '#ff2a2a': 'accent', '#ef4444': 'danger', '#f87171': 'danger-soft', '#ff375f': 'pink',
  '#10b981': 'success', '#22c55e': 'success-2', '#4ade80': 'success-3', '#34d399': 'success-4',
  '#3b82f6': 'info', '#60a5fa': 'info-2', '#93c5fd': 'info-3',
  '#f59e0b': 'warning', '#fbbf24': 'warning-2', '#f97316': 'orange',
  '#8b5cf6': 'violet', '#a78bfa': 'violet-2', '#6366f1': 'indigo', '#818cf8': 'indigo-2',
  '#06b6d4': 'cyan', '#ec4899': 'magenta', '#c89b3c': 'gold', '#facc15': 'yellow', '#eab308': 'yellow-2', '#84cc16': 'lime', '#a855f7': 'purple', '#38bdf8': 'sky', '#fb923c': 'orange-2', '#e0603b': 'blog-accent', '#08080a': 'blog-code-bg',

  // near-duplicates folded onto the closest token (≤ a few /255 difference)
  '#141414':'surface-1','#141517':'surface-2','#111214':'surface-2','#0f0f11':'surface-1','#0c0d0f':'surface',
  '#1c1c1c':'surface-4','#1c1e22':'surface-4','#191b1f':'surface-4','#1a1a1d':'surface-4','#252525':'border-strong',
  '#3e4248':'text-neutral-ghost','#4a5568':'text-faint','#e2e8f0':'text','#dbeafe':'info-3','#4f46e5':'indigo','#1d4ed8':'info',
  '#1e3a5f':'surface-blue','#1e2a38':'surface-blue','#1a1200':'surface-2','#1c1000':'surface-2',
  '#fca5a5':'danger-soft','#d97706':'warning','#78716c':'text-subtle','#92400e':'orange',
  '#fc4c02': 'brand-strava', '#ffa116': 'brand-leetcode', '#00b8a3': 'brand-leetcode-teal', '#ffc01e': 'brand-leetcode-yellow',
};
// channel triplets → var that holds "r g b"
const RGB = {
  '255,255,255': 'ink', '0,0,0': 'shadow', '255,42,42': 'accent', '239,68,68': 'danger', '248,113,113': 'danger-soft',
  '255,55,95': 'pink', '16,185,129': 'success', '34,197,94': 'success-2', '74,222,128': 'success-3', '52,211,153': 'success-4',
  '59,130,246': 'info', '96,165,250': 'info-2', '147,197,253': 'info-3', '245,158,11': 'warning', '251,191,36': 'warning-2',
  '249,115,22': 'orange', '139,92,246': 'violet', '167,139,250': 'violet-2', '99,102,241': 'indigo', '129,140,248': 'indigo-2',
  '6,182,212': 'cyan', '236,72,153': 'magenta', '200,155,60': 'gold', '250,204,21': 'yellow', '234,179,8': 'yellow-2', '132,204,22': 'lime', '168,85,247': 'purple', '56,189,248': 'sky', '251,146,60': 'orange-2', '224,96,59': 'blog-accent', '15,23,42': 'shadow',
};

const dry = process.argv.includes('--dry');
const files = process.argv.slice(2).filter(a => !a.startsWith('--'));
const norm = h => { h = h.toLowerCase(); return h.length === 4 ? '#' + [...h.slice(1)].map(x => x + x).join('') : h; };
const leftovers = {};
let total = 0;

for (const f of files) {
  let s = fs.readFileSync(f, 'utf8'); const orig = s;
  let usesTint = false;
  // 1. alpha-concat sites → tint()
  s = s.replace(/\$\{([^{}]+)\}([0-9a-fA-F]{2})\b/g, (_, e, a) => { usesTint = true; return `\${tint(${e}, ${(parseInt(a, 16) / 255).toFixed(2)})}`; });
  s = s.replace(/([\w.\[\]]+) \+ '([0-9a-fA-F]{2})'/g, (m, e, a) => { usesTint = true; return `tint(${e}, ${(parseInt(a, 16) / 255).toFixed(2)})`; });
  // 2. rgba literals
  s = s.replace(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/g, (m, r, g, b, a) => {
    const k = RGB[`${r},${g},${b}`]; if (!k) { leftovers[m] = (leftovers[m] || 0) + 1; return m; }
    return `rgb(var(--${k}-rgb) / ${+a})`;
  });
  // 3. hex literals (not followed by hex/word chars; skip html entities like &#123)
  s = s.replace(/(?<![&\w])#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (m) => {
    const k = HEX[norm(m)]; if (!k) { leftovers[norm(m)] = (leftovers[norm(m)] || 0) + 1; return m; }
    return `var(--${k})`;
  });
  if (usesTint && !/from '@\/lib\/theme'/.test(s)) {
    const imp = "import { tint } from '@/lib/theme';\n";
    const m = [...s.matchAll(/^import .*$/gm)].pop();
    s = m ? s.slice(0, m.index + m[0].length + 1) + imp + s.slice(m.index + m[0].length + 1) : "'use client';\n" + imp + s;
  }
  if (s !== orig) { total++; if (!dry) fs.writeFileSync(f, s); }
}
console.log(`${dry ? 'would change' : 'changed'} ${total} files`);
console.log('leftovers:', Object.entries(leftovers).sort((a, b) => b[1] - a[1]));
