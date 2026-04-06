'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface BerealEntry {
  id: string;
  back_photo_url: string;
  front_photo_url: string;
  captured_at: string;
}

type CapturePhase = 'idle' | 'back' | 'countdown' | 'front' | 'preview';

// ── Composite canvas helper ────────────────────────────────────────────────────

function drawComposite(
  backSrc: string,
  frontSrc: string,
  canvas: HTMLCanvasElement,
): Promise<void> {
  return new Promise(resolve => {
    const ctx = canvas.getContext('2d')!;
    const back = new Image();
    back.crossOrigin = 'anonymous';
    back.onload = () => {
      canvas.width  = back.naturalWidth;
      canvas.height = back.naturalHeight;
      ctx.drawImage(back, 0, 0);

      const front = new Image();
      front.crossOrigin = 'anonymous';
      front.onload = () => {
        const w = canvas.width  * 0.28;
        const h = canvas.height * 0.28;
        const x = canvas.width  - w - 12;
        const y = canvas.height - h - 12;

        // Rounded clip
        const r = 10;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(front, x, y, w, h);
        ctx.restore();

        // White border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.stroke();

        resolve();
      };
      front.src = frontSrc;
    };
    back.src = backSrc;
  });
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function BerealPage() {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const backBlobRef = useRef<Blob | null>(null);
  const frontBlobRef = useRef<Blob | null>(null);
  const backDataRef = useRef<string>('');
  const frontDataRef = useRef<string>('');
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement>(null);

  const [phase, setPhase]         = useState<CapturePhase>('idle');
  const [countdown, setCountdown] = useState(3);
  const [flashVisible, setFlashVisible] = useState(false);
  const [compositeUrl, setCompositeUrl] = useState<string>('');
  const [entries, setEntries]     = useState<BerealEntry[]>([]);
  const [subscribed, setSubscribed] = useState(false);
  const [subStatus, setSubStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [notifStatus, setNotifStatus] = useState<'idle' | 'sent'>('idle');
  const [cameraError, setCameraError] = useState('');

  // ── Load entries ────────────────────────────────────────────────────────────

  const loadEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/bereal/entries');
      const { entries: data } = await res.json();
      setEntries(data ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // ── Service worker + push subscription check ────────────────────────────────

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    navigator.serviceWorker.register('/sw.js').catch(() => {});

    navigator.serviceWorker.ready.then(async reg => {
      const existing = await reg.pushManager.getSubscription();
      setSubscribed(!!existing);
    });
  }, []);

  // ── Camera helpers ──────────────────────────────────────────────────────────

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    stopStream();
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Camera error';
      setCameraError(msg);
    }
  }, [stopStream]);

  const captureFrame = useCallback((): { blob: Blob; dataUrl: string } | null => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    return new Promise<{ blob: Blob; dataUrl: string } | null>(resolve => {
      canvas.toBlob(blob => resolve(blob ? { blob, dataUrl } : null), 'image/jpeg', 0.85);
    }) as unknown as { blob: Blob; dataUrl: string } | null;
  }, []);

  // ── Phase transitions ───────────────────────────────────────────────────────

  const startCapture = useCallback(async () => {
    setPhase('back');
    await startCamera('environment');
  }, [startCamera]);

  const shootBack = useCallback(async () => {
    const frame = captureFrame();
    if (!frame) return;
    // captureFrame is sync in practice (canvas.toBlob async handled below)
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    backDataRef.current = dataUrl;

    await new Promise<void>(resolve => {
      canvas.toBlob(blob => {
        if (blob) backBlobRef.current = blob;
        resolve();
      }, 'image/jpeg', 0.85);
    });

    // Flash
    setFlashVisible(true);
    setTimeout(() => setFlashVisible(false), 150);

    // Switch to front cam + countdown
    setPhase('countdown');
    setCountdown(3);
    await startCamera('user');

    let count = 3;
    const tick = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(tick);
        shootFront();
      }
    }, 1000);
  }, [captureFrame, startCamera]); // eslint-disable-line react-hooks/exhaustive-deps

  const shootFront = useCallback(async () => {
    setPhase('front');
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    frontDataRef.current = dataUrl;

    await new Promise<void>(resolve => {
      canvas.toBlob(blob => {
        if (blob) frontBlobRef.current = blob;
        resolve();
      }, 'image/jpeg', 0.85);
    });

    // Flash
    setFlashVisible(true);
    setTimeout(() => setFlashVisible(false), 150);

    stopStream();

    // Draw composite
    if (compositeCanvasRef.current) {
      await drawComposite(backDataRef.current, frontDataRef.current, compositeCanvasRef.current);
      setCompositeUrl(compositeCanvasRef.current.toDataURL('image/jpeg', 0.9));
    }

    setPhase('preview');
  }, [stopStream]);

  const retake = useCallback(() => {
    stopStream();
    backBlobRef.current  = null;
    frontBlobRef.current = null;
    backDataRef.current  = '';
    frontDataRef.current = '';
    setCompositeUrl('');
    setUploadStatus('idle');
    setPhase('idle');
  }, [stopStream]);

  const upload = useCallback(async () => {
    if (!backBlobRef.current || !frontBlobRef.current) return;
    setUploadStatus('uploading');
    try {
      const form = new FormData();
      form.append('backPhoto',  new File([backBlobRef.current],  'back.jpg',  { type: 'image/jpeg' }));
      form.append('frontPhoto', new File([frontBlobRef.current], 'front.jpg', { type: 'image/jpeg' }));
      form.append('capturedAt', new Date().toISOString());

      const res = await fetch('/api/bereal/upload', { method: 'POST', body: form });
      if (!res.ok) throw new Error('Upload failed');
      setUploadStatus('done');
      await loadEntries();
      retake();
    } catch {
      setUploadStatus('error');
    }
  }, [loadEntries, retake]);

  // ── Push subscription ───────────────────────────────────────────────────────

  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;
    setSubStatus('loading');
    try {
      const reg  = await navigator.serviceWorker.ready;
      const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const sub  = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pub),
      });
      await fetch('/api/bereal/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });
      setSubscribed(true);
      setSubStatus('done');
    } catch {
      setSubStatus('error');
    }
  }, []);

  const sendTestNotif = useCallback(async () => {
    await fetch('/api/bereal/notify?force=true');
    setNotifStatus('sent');
    setTimeout(() => setNotifStatus('idle'), 3000);
  }, []);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────

  useEffect(() => () => stopStream(), [stopStream]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const isCapturing = phase === 'back' || phase === 'countdown' || phase === 'front';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#f1f5f9',
      fontFamily: "'Barlow Condensed', sans-serif",
      paddingTop: 32,
    }}>
      {/* Flash overlay */}
      {flashVisible && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'white', opacity: 0.9,
          pointerEvents: 'none',
        }} />
      )}

      {/* Hidden helpers */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <canvas ref={compositeCanvasRef} style={{ display: 'none' }} />

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: 4, margin: 0 }}>BEREAL</h1>
          <p style={{ fontSize: 12, color: '#64748b', letterSpacing: 2, marginTop: 4 }}>
            CAPTURE YOUR MOMENT
          </p>
        </div>

        {/* Notification controls */}
        <div style={{
          display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {!subscribed ? (
            <button
              onClick={subscribe}
              disabled={subStatus === 'loading'}
              style={btnStyle('#1e293b', '#94a3b8')}
            >
              {subStatus === 'loading' ? 'SUBSCRIBING…' : subStatus === 'error' ? 'ERROR — RETRY' : '🔔 ENABLE NOTIFICATIONS'}
            </button>
          ) : (
            <div style={{ fontSize: 11, color: '#22c55e', letterSpacing: 2, padding: '8px 0' }}>
              ✓ NOTIFICATIONS ON
            </div>
          )}
          <button
            onClick={sendTestNotif}
            style={btnStyle('#1e293b', notifStatus === 'sent' ? '#22c55e' : '#64748b')}
          >
            {notifStatus === 'sent' ? '✓ SENT!' : '⚡ TEST NOTIFICATION'}
          </button>
        </div>

        {/* Camera UI */}
        {phase === 'idle' && (
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <button
              onClick={startCapture}
              style={{
                width: 80, height: 80, borderRadius: '50%',
                border: '3px solid #f1f5f9',
                background: 'transparent',
                cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <CameraIcon />
            </button>
            <p style={{ fontSize: 11, color: '#475569', letterSpacing: 2, marginTop: 12 }}>
              TAP TO START
            </p>
          </div>
        )}

        {isCapturing && (
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', display: 'block', background: '#000' }}
            />
            {/* Countdown overlay */}
            {phase === 'countdown' && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.35)',
              }}>
                <span style={{ fontSize: 96, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                  {countdown}
                </span>
              </div>
            )}
            {/* Phase label */}
            <div style={{
              position: 'absolute', top: 12, left: 12,
              background: 'rgba(0,0,0,0.6)',
              borderRadius: 4, padding: '4px 10px',
              fontSize: 10, letterSpacing: 2, color: '#f1f5f9',
            }}>
              {phase === 'back' ? '📷 BACK CAMERA' : phase === 'countdown' ? '🤳 GET READY…' : '🤳 FRONT CAMERA'}
            </div>
          </div>
        )}

        {isCapturing && phase === 'back' && (
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <button
              onClick={shootBack}
              style={{
                width: 72, height: 72, borderRadius: '50%',
                border: '3px solid #f1f5f9',
                background: 'rgba(255,255,255,0.12)',
                cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f1f5f9' }} />
            </button>
          </div>
        )}

        {cameraError && (
          <div style={{ color: '#f87171', fontSize: 12, textAlign: 'center', marginBottom: 16, letterSpacing: 1 }}>
            {cameraError}
          </div>
        )}

        {/* Preview + actions */}
        {phase === 'preview' && compositeUrl && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
              <img src={compositeUrl} alt="BeReal preview" style={{ width: '100%', display: 'block' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={retake}
                style={{ ...btnStyle('#1e293b', '#94a3b8'), flex: 1 }}
              >
                RETAKE
              </button>
              <button
                onClick={upload}
                disabled={uploadStatus === 'uploading'}
                style={{ ...btnStyle('#1d4ed8', '#f1f5f9'), flex: 1 }}
              >
                {uploadStatus === 'uploading' ? 'SAVING…' : uploadStatus === 'error' ? 'ERROR — RETRY' : 'POST'}
              </button>
            </div>
          </div>
        )}

        {/* Gallery */}
        {entries.length > 0 && (
          <div>
            <h2 style={{ fontSize: 13, letterSpacing: 3, color: '#475569', marginBottom: 14, fontWeight: 700 }}>
              PAST MOMENTS
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {entries.map(entry => (
                <EntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Entry card with composite rendering ────────────────────────────────────────

function EntryCard({ entry }: { entry: BerealEntry }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    drawComposite(entry.back_photo_url, entry.front_photo_url, canvasRef.current).then(() => setDrawn(true));
  }, [entry]);

  const date = new Date(entry.captured_at);
  const label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    + ' · ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', background: '#111' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', display: drawn ? 'block' : 'none' }}
      />
      {!drawn && (
        <div style={{
          height: 200, background: '#111', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: 11,
        }}>
          LOADING…
        </div>
      )}
      <div style={{ padding: '8px 12px', fontSize: 11, color: '#475569', letterSpacing: 1 }}>
        {label}
      </div>
    </div>
  );
}

// ── Utility ────────────────────────────────────────────────────────────────────

function btnStyle(bg: string, color: string): React.CSSProperties {
  return {
    padding: '10px 18px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.1)',
    background: bg,
    color,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2,
    cursor: 'pointer',
    fontFamily: "'Barlow Condensed', sans-serif",
    transition: 'opacity 0.15s',
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return Uint8Array.from({ length: raw.length }, (_, i) => raw.charCodeAt(i));
}

function CameraIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f1f5f9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
