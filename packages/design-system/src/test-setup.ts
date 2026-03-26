// Polyfill CSS.supports for jsdom (not available natively).
/* eslint-disable @typescript-eslint/no-explicit-any */

const g = globalThis as any;

if (typeof g.CSS === "undefined") {
  g.CSS = { supports: () => false };
}
