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
        background: isPB ? 'linear-gradient(135deg, var(--surface-2), var(--surface-2))' : 'var(--surface-4)',
        border: `1px solid ${isPB ? 'rgb(var(--warning-rgb) / 0.4)' : 'rgb(var(--ink-rgb) / 0.1)'}`,
        borderRadius: 8,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        maxWidth: 320,
        cursor: 'pointer',
        boxShadow: '0 4px 24px rgb(var(--shadow-rgb) / 0.5)',
      }}
    >
      <span style={{ fontSize: 20, flexShrink: 0 }}>{isPB ? '🏆' : 'ℹ️'}</span>
      <span style={{
        fontSize: 13,
        fontWeight: 600,
        color: isPB ? 'var(--warning-2)' : 'var(--text)',
        fontFamily: "'Barlow Condensed', sans-serif",
        lineHeight: 1.4,
      }}>
        {message}
      </span>
    </div>
  );
}
