// Barcode scanning that works everywhere:
//   1. Native BarcodeDetector (Chrome / Android / newer Safari) — fastest
//   2. ZXing (bundled JS decoder, lazy-loaded) — works on iPhone Safari too
//   3. Photo → ZXing → Claude vision as the last resort (see readBarcodeWithAI)

import { normCode, imageToJpegBase64 } from './util';
import { readBarcodeWithAI } from './ai';

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'data_matrix', 'qr_code'];

export const hasNativeDetector = () => typeof window !== 'undefined' && 'BarcodeDetector' in window;
export const hasCamera = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

let zxingPromise: Promise<any> | null = null;
async function loadZxing() {
  if (!zxingPromise) {
    zxingPromise = Promise.all([import('@zxing/browser'), import('@zxing/library')]).then(([browser, lib]) => {
      const hints = new Map();
      const F = lib.BarcodeFormat;
      hints.set(lib.DecodeHintType.POSSIBLE_FORMATS, [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128, F.CODE_39, F.ITF, F.DATA_MATRIX, F.QR_CODE]);
      hints.set(lib.DecodeHintType.TRY_HARDER, true);
      return new browser.BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150, delayBetweenScanSuccess: 1500 });
    }).catch(e => { zxingPromise = null; throw e; });
  }
  return zxingPromise;
}

export interface LiveScan { stop: () => void; engine: 'native' | 'zxing' }

/**
 * Start scanning from the rear camera into `video`. Calls `onCode` once with the
 * first barcode found, then stops itself. Throws if the camera can't be opened.
 */
export async function startLiveScan(video: HTMLVideoElement, onCode: (code: string) => void): Promise<LiveScan> {
  if (!hasCamera()) throw new Error('Camera not available in this browser');
  let done = false;
  let stopImpl: () => void = () => {};
  const stop = () => { if (done) return; done = true; try { stopImpl(); } catch {} };
  const fire = (raw: string) => {
    const code = normCode(raw);
    if (done || !code) return;
    stop();
    onCode(code);
  };

  if (hasNativeDetector()) {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    video.srcObject = stream;
    await video.play().catch(() => {});
    const Det = (window as any).BarcodeDetector;
    let det: any;
    try {
      const supported: string[] = (await Det.getSupportedFormats?.()) || FORMATS;
      det = new Det({ formats: FORMATS.filter(f => supported.includes(f)) });
    } catch { det = new Det(); }
    const timer = setInterval(async () => {
      if (done || video.readyState < 2) return;
      try {
        const codes = await det.detect(video);
        if (codes?.length) fire(codes[0].rawValue);
      } catch {}
    }, 250);
    stopImpl = () => { clearInterval(timer); stream.getTracks().forEach(t => t.stop()); video.srcObject = null; };
    return { stop, engine: 'native' };
  }

  const reader = await loadZxing();
  const controls = await reader.decodeFromConstraints(
    { video: { facingMode: { ideal: 'environment' } }, audio: false },
    video,
    (result: any) => { if (result) fire(result.getText()); },
  );
  stopImpl = () => controls.stop();
  if (done) stopImpl(); // a stop() arrived while the camera was opening
  return { stop, engine: 'zxing' };
}

/** Decode a barcode from a photo: local decoder first, then Claude vision. */
export async function decodeImageFile(file: File, opts: { allowAI?: boolean } = {}): Promise<{ code: string; via: 'zxing' | 'ai' | 'none' }> {
  const jpeg = await imageToJpegBase64(file, 1600, 0.9);
  try {
    const reader = await loadZxing();
    const result = await reader.decodeFromImageUrl('data:image/jpeg;base64,' + jpeg);
    const code = normCode(result?.getText?.());
    if (code) return { code, via: 'zxing' };
  } catch { /* not found locally — fall through */ }
  if (opts.allowAI === false) return { code: '', via: 'none' };
  const code = await readBarcodeWithAI(jpeg);
  return code ? { code, via: 'ai' } : { code: '', via: 'none' };
}
