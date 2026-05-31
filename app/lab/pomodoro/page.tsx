'use client';

import { useState, useEffect, useRef } from 'react';

const MONO = "'JetBrains Mono', monospace";

// ── Mode config ────────────────────────────────────────────────────────────────
const MODES = [
  { key: 'voyage'      as const, label: 'VOYAGE',       sub: 'GRAND LINE',   defaultMins: 25, color: '#00b8a3' },
  { key: 'short-break' as const, label: 'SHORT BREAK',  sub: 'ISLAND DOCK',  defaultMins: 5,  color: '#f59e0b' },
  { key: 'long-break'  as const, label: 'HARBOUR REST', sub: 'SAFE HARBOR',  defaultMins: 15, color: '#8b5cf6' },
] as const;

type ModeKey = 'voyage' | 'short-break' | 'long-break';

// ── SVG geometry ───────────────────────────────────────────────────────────────
const CX = 160, CY = 160;
const OUTER_R = 148;
const INNER_R = 138;
const GLASS_R = 126;
const PROG_R  = 143;
const NEEDLE_LEN = GLASS_R - 18;
const CIRC = 2 * Math.PI * PROG_R;

const TICKS = Array.from({ length: 60 }, (_, i) => {
  const angle = (i / 60) * 360 - 90;
  const rad = angle * Math.PI / 180;
  const major = i % 5 === 0;
  const r1 = major ? INNER_R - 10 : INNER_R - 4;
  const r2 = INNER_R - 1;
  return {
    x1: CX + r1 * Math.cos(rad), y1: CY + r1 * Math.sin(rad),
    x2: CX + r2 * Math.cos(rad), y2: CY + r2 * Math.sin(rad),
    major,
  };
});

function hexRgb(hex: string) {
  return `${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}`;
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function PomodoroPage() {
  const [mode, setMode]       = useState<ModeKey>('voyage');
  const [custom, setCustom]   = useState<Record<ModeKey, number>>({ voyage: 25, 'short-break': 5, 'long-break': 15 });
  const [remain, setRemain]   = useState(25 * 60);
  const [total, setTotal]     = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone]       = useState(false);
  const [islands, setIslands] = useState(0);
  const [settings, setSettings] = useState(false);
  const [inputMins, setInputMins] = useState<Record<ModeKey, string>>({
    voyage: '25', 'short-break': '5', 'long-break': '15',
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const m        = MODES.find(x => x.key === mode)!;
  const progress = total > 0 ? (total - remain) / total : 0;
  const needleDeg = progress * 330;
  const offset   = CIRC * (1 - progress);
  const mins     = Math.floor(remain / 60);
  const secs     = remain % 60;
  const timeStr  = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const nearEnd  = progress > 0.85 && running;
  const idle     = !running && !done && progress === 0;
  const accent   = nearEnd ? '#ef4444' : m.color;

  const dropShadow = done
    ? `drop-shadow(0 0 40px ${accent}99) drop-shadow(0 0 90px ${accent}44)`
    : nearEnd
    ? `drop-shadow(0 0 28px ${accent}88)`
    : `drop-shadow(0 0 18px rgba(0,184,163,0.28))`;

  // ── Timer logic ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (running && !done) {
      timerRef.current = setInterval(() => {
        setRemain(r => {
          if (r <= 1) {
            clearInterval(timerRef.current!);
            setRunning(false);
            setDone(true);
            setIslands(i => i + 1);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running, done]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function switchMode(k: ModeKey) {
    if (timerRef.current) clearInterval(timerRef.current);
    const s = custom[k] * 60;
    setMode(k); setRemain(s); setTotal(s); setRunning(false); setDone(false);
  }

  function startPause() {
    if (done) {
      const s = custom[mode] * 60;
      setRemain(s); setTotal(s); setDone(false); setRunning(true);
    } else {
      setRunning(r => !r);
    }
  }

  function reset() {
    if (timerRef.current) clearInterval(timerRef.current);
    const s = custom[mode] * 60;
    setRemain(s); setTotal(s); setRunning(false); setDone(false);
  }

  function saveSettings() {
    const next: Record<ModeKey, number> = {
      voyage:        Math.max(1, Math.min(99, parseInt(inputMins.voyage)          || 25)),
      'short-break': Math.max(1, Math.min(60, parseInt(inputMins['short-break'])  || 5)),
      'long-break':  Math.max(1, Math.min(60, parseInt(inputMins['long-break'])   || 15)),
    };
    setCustom(next);
    if (timerRef.current) clearInterval(timerRef.current);
    const s = next[mode] * 60;
    setRemain(s); setTotal(s); setRunning(false); setDone(false);
    setSettings(false);
  }

  // ── Needle transition config ──────────────────────────────────────────────────
  const needleTransition = idle
    ? 'none'
    : done
    ? 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)'
    : running
    ? 'transform 0.95s linear'
    : 'transform 0.4s ease';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#060c1a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: MONO,
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* ── CSS keyframes ──────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes needleDrift {
          0%, 100% { transform: rotate(-5deg); }
          50%       { transform: rotate(5deg);  }
        }
        @keyframes fadein {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes pulseFill {
          0%, 100% { opacity: 0.08; }
          50%       { opacity: 0.22; }
        }
        @keyframes completePulse {
          0%, 100% { opacity: 0.12; }
          50%       { opacity: 0.32; }
        }
        @keyframes islandGlow {
          0%, 100% { box-shadow: 0 0 4px ${accent}66; }
          50%       { box-shadow: 0 0 14px ${accent}cc; }
        }
        .pomodoro-btn:hover {
          filter: brightness(1.15);
        }
      `}</style>

      {/* ── Sea-map background layers ────────────────────────────────────────── */}
      {/* Radial depth */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 100% 80% at 50% 50%, rgba(0,40,110,0.14) 0%, transparent 68%)',
      }} />
      {/* Grid lines */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.028 }}>
        <defs>
          <pattern id="mapgrid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#C89B3C" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mapgrid)" />
      </svg>
      {/* Compass rose (huge, faint) */}
      <svg
        style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none', opacity: 0.032 }}
        width="720" height="720" viewBox="0 0 720 720"
      >
        {[0, 45, 90, 135, 180, 225, 270, 315].map(a => {
          const rad = (a - 90) * Math.PI / 180;
          return (
            <line key={a}
              x1={360} y1={360}
              x2={360 + 340 * Math.cos(rad)} y2={360 + 340 * Math.sin(rad)}
              stroke="#C89B3C" strokeWidth={a % 90 === 0 ? 1.5 : 0.7}
            />
          );
        })}
        <circle cx="360" cy="360" r="340" fill="none" stroke="#C89B3C" strokeWidth="0.7" />
        <circle cx="360" cy="360" r="230" fill="none" stroke="#C89B3C" strokeWidth="0.4" />
      </svg>

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div style={{ position: 'absolute', top: 56, textAlign: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: 8, color: '#1e2d40', letterSpacing: 6, marginBottom: 10 }}>
          THE LAB / POMODORO
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#7a6540', letterSpacing: 9 }}>
          SET COURSE
        </div>
        <div style={{ fontSize: 7, color: '#1e2d40', letterSpacing: 5, marginTop: 8 }}>
          {done ? '— DESTINATION REACHED —' : running ? m.sub : 'CHART YOUR VOYAGE'}
        </div>
      </div>

      {/* ── Log Pose SVG ─────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', marginBottom: 34 }}>
        <svg
          width="320" height="320" viewBox="0 0 320 320"
          style={{ filter: dropShadow, display: 'block' }}
        >
          <defs>
            {/* Brass ring gradient */}
            <linearGradient id="rg" x1="15%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%"   stopColor="#3d2c14" />
              <stop offset="18%"  stopColor="#C89B3C" />
              <stop offset="40%"  stopColor="#7a5a28" />
              <stop offset="62%"  stopColor="#D4A843" />
              <stop offset="82%"  stopColor="#9a7030" />
              <stop offset="100%" stopColor="#3d2c14" />
            </linearGradient>
            {/* Glass orb gradient */}
            <radialGradient id="gg" cx="37%" cy="29%" r="68%">
              <stop offset="0%"   stopColor="rgba(70,150,210,0.22)" />
              <stop offset="38%"  stopColor="rgba(6,22,65,0.78)" />
              <stop offset="100%" stopColor="rgba(2,8,24,0.97)"  />
            </radialGradient>
            {/* Needle glow filter */}
            <filter id="ng" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Outer shadow */}
          <circle cx={CX} cy={CY} r={OUTER_R + 8} fill="rgba(0,0,0,0.65)" />

          {/* Brass ring */}
          <circle cx={CX} cy={CY} r={OUTER_R} fill="url(#rg)" />

          {/* Tick marks */}
          {TICKS.map((t, i) => (
            <line key={i}
              x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke={t.major ? 'rgba(212,168,67,0.65)' : 'rgba(212,168,67,0.25)'}
              strokeWidth={t.major ? 1.5 : 0.8}
            />
          ))}

          {/* Inner bevel */}
          <circle cx={CX} cy={CY} r={INNER_R}
            fill="rgba(10,7,3,0.92)"
            stroke="rgba(196,155,60,0.2)" strokeWidth="2"
          />

          {/* Progress track (dark) */}
          <circle cx={CX} cy={CY} r={PROG_R}
            fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="6"
          />
          {/* Progress fill */}
          <circle cx={CX} cy={CY} r={PROG_R}
            fill="none"
            stroke={accent}
            strokeWidth="4.5"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${CX} ${CY})`}
            style={{ transition: 'stroke-dashoffset 0.95s linear, stroke 0.5s ease' }}
            opacity="0.88"
          />

          {/* Glass orb */}
          <circle cx={CX} cy={CY} r={GLASS_R} fill="url(#gg)" />

          {/* Completion pulse overlay */}
          {done && (
            <circle cx={CX} cy={CY} r={GLASS_R}
              fill={accent}
              style={{ animation: 'completePulse 2s ease-in-out infinite' }}
            />
          )}

          {/* Near-end inner glow */}
          {(nearEnd && !done) && (
            <circle cx={CX} cy={CY} r={GLASS_R * 0.6}
              fill={accent}
              style={{ animation: 'pulseFill 1.5s ease-in-out infinite' }}
            />
          )}

          {/* Glass highlights */}
          <ellipse cx={CX - 32} cy={CY - 38} rx="40" ry="25" fill="rgba(255,255,255,0.055)" />
          <ellipse cx={CX - 26} cy={CY - 44} rx="18" ry="10" fill="rgba(255,255,255,0.088)" />
          <ellipse cx={CX - 18} cy={CY - 50} rx="7"  ry="4"  fill="rgba(255,255,255,0.15)"  />

          {/* Cardinal letters */}
          {[{ a: -90, l: 'N' }, { a: 0, l: 'E' }, { a: 90, l: 'S' }, { a: 180, l: 'W' }].map(({ a, l }) => {
            const rad = a * Math.PI / 180;
            const r = GLASS_R - 15;
            return (
              <text key={l}
                x={CX + r * Math.cos(rad)} y={CY + r * Math.sin(rad) + 3.5}
                textAnchor="middle" dominantBaseline="middle"
                fill="rgba(212,168,67,0.22)"
                fontSize="9" fontFamily={MONO}
              >{l}</text>
            );
          })}

          {/* ── Needle (translated so rotation origin = orb center) ────────── */}
          <g transform={`translate(${CX}, ${CY})`}>
            <g
              filter="url(#ng)"
              style={{
                transformOrigin: '0 0',
                animation: idle ? 'needleDrift 4s ease-in-out infinite' : 'none',
                transform: idle ? undefined : `rotate(${needleDeg}deg)`,
                transition: needleTransition,
              }}
            >
              {/* Tail */}
              <line
                x1="0" y1="42" x2="0" y2="8"
                stroke={accent + '55'} strokeWidth="1.5" strokeLinecap="round"
                style={{ transition: 'stroke 0.5s ease' }}
              />
              {/* Body */}
              <line
                x1="0" y1="6" x2="0" y2={-(NEEDLE_LEN - 12)}
                stroke={accent} strokeWidth="2.2" strokeLinecap="round"
                style={{ transition: 'stroke 0.5s ease' }}
              />
              {/* Tip diamond */}
              <polygon
                points={`0,${-(NEEDLE_LEN - 4)} 4,${-(NEEDLE_LEN - 16)} 0,${-(NEEDLE_LEN - 12)} -4,${-(NEEDLE_LEN - 16)}`}
                fill={accent}
                style={{ transition: 'fill 0.5s ease' }}
              />
            </g>
          </g>

          {/* Center pivot */}
          <circle cx={CX} cy={CY} r="8.5" fill="#C89B3C" stroke="#3d2c14" strokeWidth="1.5" />
          <circle cx={CX} cy={CY} r="3.5" fill="#06080f" />

          {/* Timer text */}
          {!done ? (
            <text
              x={CX} y={CY + 54}
              textAnchor="middle"
              fill="#dce0ea"
              fontSize="36"
              fontFamily={MONO}
              fontWeight="700"
              letterSpacing="4"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >{timeStr}</text>
          ) : (
            <>
              <text x={CX} y={CY + 38} textAnchor="middle"
                fill={accent} fontSize="9" fontFamily={MONO} letterSpacing="4">
                DESTINATION
              </text>
              <text x={CX} y={CY + 56} textAnchor="middle"
                fill={accent} fontSize="9" fontFamily={MONO} letterSpacing="4">
                REACHED
              </text>
            </>
          )}

          {/* Corner rivets */}
          {[45, 135, 225, 315].map(a => {
            const rad = (a - 90) * Math.PI / 180;
            return (
              <circle key={a}
                cx={CX + (OUTER_R + 1) * Math.cos(rad)}
                cy={CY + (OUTER_R + 1) * Math.sin(rad)}
                r="5"
                fill="#5a3e1e"
                stroke="#C89B3C"
                strokeWidth="0.8"
              />
            );
          })}
        </svg>
      </div>

      {/* ── Mode selector ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        {MODES.map(x => (
          <button key={x.key} onClick={() => switchMode(x.key)}
            className="pomodoro-btn"
            style={{
              padding: '8px 16px',
              background: mode === x.key ? `rgba(${hexRgb(x.color)}, 0.13)` : 'rgba(255,255,255,0.02)',
              border: `1px solid ${mode === x.key ? x.color + '55' : 'rgba(255,255,255,0.05)'}`,
              color: mode === x.key ? x.color : '#2f3d52',
              fontSize: 8, letterSpacing: 3, cursor: 'pointer', fontFamily: MONO,
              transition: 'all 0.2s',
            }}
          >{x.label}</button>
        ))}
      </div>

      {/* ── Controls ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        {/* Main CTA */}
        <button onClick={startPause}
          className="pomodoro-btn"
          style={{
            padding: '13px 46px',
            background: `rgba(${hexRgb(accent)}, 0.14)`,
            border: `1px solid ${accent}77`,
            color: accent,
            fontSize: 11, letterSpacing: 5, cursor: 'pointer', fontFamily: MONO, fontWeight: 700,
            transition: 'all 0.2s',
          }}
        >
          {done ? 'SET SAIL' : running ? 'HOLD' : progress > 0 ? 'RESUME' : 'DEPART'}
        </button>
        {/* Reset */}
        <button onClick={reset}
          className="pomodoro-btn"
          style={{
            padding: '13px 24px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: '#2f3d52', fontSize: 11, letterSpacing: 4, cursor: 'pointer', fontFamily: MONO,
            transition: 'all 0.2s',
          }}
        >RESET</button>
        {/* Settings */}
        <button onClick={() => setSettings(s => !s)}
          className="pomodoro-btn"
          style={{
            padding: '13px 20px',
            background: settings ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: '#2f3d52', fontSize: 15, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >⚙</button>
      </div>

      {/* ── Island tracker ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 7, color: '#1a2a3a', letterSpacing: 4 }}>ISLANDS</div>
        {Array.from({ length: 4 }).map((_, i) => {
          const lit = i < (islands % 5);
          return (
            <div key={i} style={{
              width: 9, height: 9, borderRadius: '50%',
              background: lit ? accent : 'rgba(255,255,255,0.04)',
              border: `1px solid ${lit ? accent + '77' : 'rgba(255,255,255,0.05)'}`,
              transition: 'all 0.5s ease',
              animation: lit ? 'islandGlow 2s ease-in-out infinite' : 'none',
            }} />
          );
        })}
        {islands > 0 && (
          <div style={{ fontSize: 7, color: '#1e2d40', letterSpacing: 3, marginLeft: 4 }}>
            {islands} TOTAL
          </div>
        )}
      </div>

      {/* ── Settings overlay ─────────────────────────────────────────────────── */}
      {settings && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadein 0.2s ease',
          }}
          onClick={() => setSettings(false)}
        >
          <div
            style={{
              background: '#07101f',
              border: '1px solid rgba(196,155,60,0.28)',
              padding: '36px 42px',
              minWidth: 320,
              animation: 'fadein 0.2s ease',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 9, color: '#8a7040', letterSpacing: 6, marginBottom: 28 }}>
              CONFIGURE ROUTE
            </div>
            {MODES.map(x => (
              <div key={x.key} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 8, color: '#2f3d52', letterSpacing: 3, marginBottom: 7 }}>
                  {x.label} — MINUTES
                </div>
                <input
                  type="number" min="1" max="99"
                  value={inputMins[x.key]}
                  onChange={e => setInputMins(p => ({ ...p, [x.key]: e.target.value }))}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(196,155,60,0.2)',
                    color: '#dce0ea', padding: '10px 14px',
                    fontFamily: MONO, fontSize: 16,
                    width: '100%', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}
            <button onClick={saveSettings}
              className="pomodoro-btn"
              style={{
                width: '100%', padding: '13px',
                background: 'rgba(196,155,60,0.1)',
                border: '1px solid rgba(196,155,60,0.38)',
                color: '#C89B3C', fontSize: 10, letterSpacing: 5,
                cursor: 'pointer', fontFamily: MONO, marginTop: 8,
                transition: 'all 0.2s',
              }}
            >SET COURSE</button>
          </div>
        </div>
      )}
    </div>
  );
}
