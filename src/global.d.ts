declare module '*.css';
declare module '*.svg';
declare module '*.png';

declare global {
  interface Window {
    storage?: any;
    XLSX?: any;
    BarcodeDetector?: any;
  }
}

export {};