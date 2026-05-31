'use client';

import { useEffect } from 'react';

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: number;
}

export default function Modal({ children, onClose, maxWidth = 480 }: ModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '0',
      }}
      className="md:items-center md:p-6"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="animate-fade-in md:rounded-xl"
        style={{
          background: '#111',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px 16px 0 0',
          width: '100%',
          maxWidth,
          maxHeight: '90dvh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
