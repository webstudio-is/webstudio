// Polyfill CSS.supports for jsdom (not available natively in jsdom 20)
if (typeof globalThis.CSS === "undefined") {
  (globalThis as typeof globalThis & { CSS: unknown }).CSS = {
    supports: () => false,
  };
}
