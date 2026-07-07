// Polyfill CSS.supports for jsdom (not available natively).
/* eslint-disable @typescript-eslint/no-explicit-any */

const g = globalThis as any;

if (typeof g.CSS === "undefined") {
  g.CSS = { supports: () => false };
}

// jsdom does not implement canvas, while hdr-color-input touches getContext
// during module evaluation through the design-system barrel import.
if (g.HTMLCanvasElement !== undefined) {
  g.HTMLCanvasElement.prototype.getContext = () => null;
}
