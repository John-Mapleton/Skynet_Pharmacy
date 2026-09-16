import { useEffect, useRef, useState } from 'react';
import { Sheet } from './ui';
import { decodeImageFile, hasCamera, hasNativeDetector, startLiveScan, type LiveScan } from '../lib/scanner';
import { normCode } from '../lib/util';
import { playSuccessBlip } from '../lib/fun';

type Mode = 'options' | 'camera' | 'manual' | 'processing';

/**
 * Inline scanner panel: live camera (native or ZXing), photo, or manual entry.
 * Used directly by the Scan tab and wrapped in a Sheet everywhere else.
 */
export function ScannerPanel({ onCode, onCancel, allowManual = true, autoStart = false }: {
  onCode: (code: string) => void; onCancel?: () => void; allowManual?: boolean; autoStart?: boolean;
}) {
  const [mode, setMode] = useState<Mode>('options');
  const [error, setError] = useState('');
  const [manual, setManual] = useState('');
  const [engine, setEngine] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanRef = useRef<LiveScan | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const stop = () => { scanRef.current?.stop(); scanRef.current = null; };
  useEffect(() => () => stop(), []);

  const deliver = (code: string) => {
    const c = normCode(code);
    if (!c) { setError('No code found'); setMode('options'); return; }
    playSuccessBlip();
    onCode(c);
  };

  async function startCamera() {
    setError(''); setMode('camera');
    // wait a tick so the <video> is mounted
    await new Promise(r => setTimeout(r, 30));
    if (!videoRef.current) return;
    try {
      const scan = await startLiveScan(videoRef.current, code => { scanRef.current = null; deliver(code); });
      scanRef.current = scan;
      setEngine(scan.engine === 'native' ? 'Live scan' : 'Live scan (ZXing)');
    } catch (e: any) {
      const name = e?.name || '';
      setError(name === 'NotAllowedError' ? 'Camera permission denied — allow camera access in your browser settings, or use Photo.'
        : name === 'NotFoundError' ? 'No camera found on this device — use Photo or type the code.'
        : (e?.message || 'Could not start the camera'));
      setMode('options');
    }
  }

  useEffect(() => { if (autoStart && hasCamera()) startCamera(); /* eslint-disable-line */ }, []);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    setMode('processing'); setError('');
    try {
      const { code, via } = await decodeImageFile(file);
      if (!code) { setError('No barcode found in that photo — try closer, with the numbers visible'); setMode('options'); return; }
      setEngine(via === 'ai' ? 'Read by AI' : 'Photo scan');
      deliver(code);
    } catch (err: any) {
      setError(err?.message || 'Could not read the photo'); setMode('options');
    }
  }

  return (
    <div>
      {mode === 'options' && (
        <div className="stack">
          {hasCamera() && <button className="btn btn-p btn-full" onClick={startCamera}>📸 Live camera scan</button>}
          <button className="btn btn-s btn-full" onClick={() => fileRef.current?.click()}>🖼️ Take a photo of the barcode</button>
          {allowManual && <button className="btn btn-s btn-full" onClick={() => setMode('manual')}>⌨️ Type the code</button>}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />
          {error && <div className="notice err" style={{ marginBottom: 0 }}>{error}</div>}
          {onCancel && <button className="btn btn-w btn-full" onClick={onCancel}>Cancel</button>}
          <div className="hint">{hasNativeDetector() ? 'Live scan uses your device’s built-in barcode reader.' : 'Live scan works on iPhone too — point the camera at the barcode.'}</div>
        </div>
      )}

      {mode === 'camera' && (
        <div>
          <div className="cam" style={{ marginBottom: 12 }}>
            <video ref={videoRef} autoPlay playsInline muted />
            <div className="scanline" />
            <div className="cam-note">{engine || 'Starting camera…'} — point at the barcode</div>
          </div>
          <div className="flex">
            <button className="btn btn-s" style={{ flex: 1 }} onClick={() => { stop(); fileRef.current?.click(); }}>🖼️ Photo instead</button>
            <button className="btn btn-w" style={{ flex: 1 }} onClick={() => { stop(); setMode('options'); onCancel?.(); }}>Cancel</button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />
        </div>
      )}

      {mode === 'manual' && (
        <div>
          <div className="ig">
            <label className="lbl">Barcode, DIN, vendor code or SKYNET # </label>
            <input className="inp mono" style={{ fontSize: 18, letterSpacing: '.05em' }} placeholder="Enter barcode digits"
              value={manual} onChange={e => setManual(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && manual) deliver(manual); }} />
          </div>
          <div className="flex">
            <button className="btn btn-p" style={{ flex: 1 }} disabled={!normCode(manual)} onClick={() => deliver(manual)}>Look up</button>
            <button className="btn btn-w" onClick={() => setMode('options')}>Back</button>
          </div>
        </div>
      )}

      {mode === 'processing' && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div className="spin lg" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontSize: 14, color: 'var(--text2)' }}>Reading barcode…</div>
        </div>
      )}
    </div>
  );
}

export function BarcodeScannerSheet({ onCode, onClose, title = 'Scan barcode' }: { onCode: (code: string) => void; onClose: () => void; title?: string }) {
  return (
    <Sheet title={title} onClose={onClose}>
      <ScannerPanel onCode={onCode} onCancel={onClose} autoStart />
    </Sheet>
  );
}
