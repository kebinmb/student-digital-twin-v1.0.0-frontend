/**
 * Polyfill for Node.js `global` expected by third-party libraries (e.g., sockjs-client).
 */
if (typeof window !== 'undefined') {
  (window as any).global = window;
}
if (typeof globalThis !== 'undefined') {
  (globalThis as any).global = globalThis;
}
