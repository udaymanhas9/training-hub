'use client';

interface ToastProps {
  message: string;
  type?: 'pb' | 'info';
  onDismiss: () => void;
}

export default function Toast({ message, type = 'info', onDismiss }: ToastProps) {
  const isPB = type === 'pb';
  return (
    <div
      className="animate-slide-in"
      onClick={onDismiss}
      style={{
        background: isPB ? 'linear-gradient(135deg, #1a1200, #1c1000)' : '#1a1a1a',
        border: `1px solid ${isPB ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 8,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        maxWidth: 320,
        cursor: 'pointer',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      }}
    >
      <span style={{ fontSize: 20, flexShrink: 0 }}>{isPB ? '🏆' : 'ℹ️'}</span>
      <span style={{
        fontSize: 13,
        fontWeight: 600,
        color: isPB ? '#fbbf24' : '#f1f5f9',
        fontFamily: "'Barlow', sans-serif",
        lineHeight: 1.4,
      }}>
        {message}
      </span>
    </div>
  );
}
