'use client';

import dynamic from 'next/dynamic';
import { StravaActivity } from '@/lib/types';

const RunMap = dynamic(() => import('./RunMap'), { ssr: false, loading: () => (
  <div style={{ width: '100%', height: 280, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 12 }}>
    Loading map...
  </div>
) });

function fmtPace(metersPerSec: number): string {
  if (!metersPerSec || metersPerSec === 0) return '—';
  const secsPerKm = 1000 / metersPerSec;
  const mins = Math.floor(secsPerKm / 60);
  const secs = Math.floor(secsPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}

function fmtTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function fmtDist(m: number): string {
  return `${(m / 1000).toFixed(2)} km`;
}

interface RunDetailModalProps {
  activity: StravaActivity;
  onClose: () => void;
}

export default function RunDetailModal({ activity, onClose }: RunDetailModalProps) {
  const stats = [
    { label: 'DISTANCE',  value: fmtDist(activity.distance) },
    { label: 'TIME',      value: fmtTime(activity.movingTime) },
    { label: 'AVG PACE',  value: fmtPace(activity.averageSpeed) },
    { label: 'ELEVATION', value: `${Math.round(activity.totalElevationGain)}m` },
    { label: 'AVG HR',    value: activity.averageHeartrate ? `${Math.round(activity.averageHeartrate)} bpm` : '—' },
    { label: 'MAX HR',    value: activity.maxHeartrate ? `${Math.round(activity.maxHeartrate)} bpm` : '—' },
    { label: 'CADENCE',   value: activity.averageCadence ? `${Math.round(activity.averageCadence * 2)} spm` : '—' },
    { label: 'CALORIES',  value: activity.calories ? `${Math.round(activity.calories)} kcal` : '—' },
  ];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0d0d0d',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          width: '100%', maxWidth: 680,
          maxHeight: '90vh', overflowY: 'auto',
          padding: 28,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 4, color: '#64748b', fontFamily: "'Barlow', sans-serif", marginBottom: 4 }}>
              {activity.type.toUpperCase()} · {new Date(activity.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#f1f5f9', letterSpacing: -0.5 }}>{activity.name}</h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 24, lineHeight: 1, padding: 4 }}
          >×</button>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {stats.map(({ label, value }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 9, letterSpacing: 3, color: '#475569', fontFamily: "'Barlow', sans-serif", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Map */}
        {activity.mapPolyline && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, letterSpacing: 4, color: '#475569', fontFamily: "'Barlow', sans-serif", marginBottom: 10 }}>ROUTE</div>
            <RunMap polyline={activity.mapPolyline} />
          </div>
        )}

        {/* Splits table */}
        {activity.splits && activity.splits.length > 0 && (
          <div>
            <div style={{ fontSize: 10, letterSpacing: 4, color: '#475569', fontFamily: "'Barlow', sans-serif", marginBottom: 10 }}>
              SPLITS (PER KM)
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['KM', 'DIST', 'TIME', 'PACE', 'ELEV', 'HR'].map(h => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 9, letterSpacing: 3, color: '#475569', fontFamily: "'Barlow', sans-serif", fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activity.splits.map(split => (
                    <tr key={split.splitIndex} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '8px 10px', color: '#64748b', fontWeight: 700 }}>{split.splitIndex}</td>
                      <td style={{ padding: '8px 10px', color: '#f1f5f9' }}>{fmtDist(split.distance)}</td>
                      <td style={{ padding: '8px 10px', color: '#f1f5f9' }}>{fmtTime(split.movingTime)}</td>
                      <td style={{ padding: '8px 10px', color: '#3b82f6', fontWeight: 700 }}>{fmtPace(split.averageSpeed)}</td>
                      <td style={{ padding: '8px 10px', color: split.elevationDifference > 0 ? '#f59e0b' : '#10b981' }}>
                        {split.elevationDifference > 0 ? '+' : ''}{Math.round(split.elevationDifference)}m
                      </td>
                      <td style={{ padding: '8px 10px', color: '#ef4444' }}>
                        {split.averageHeartrate ? `${Math.round(split.averageHeartrate)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
