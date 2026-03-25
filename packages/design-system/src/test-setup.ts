// Polyfill browser globals needed by hdr-color-input at module load time.
// These are stubs — just enough for the module to be imported without throwing.
/* eslint-disable @typescript-eslint/no-explicit-any */

const g = globalThis as any;

if (typeof g.CSS === "undefined") {
  g.CSS = { supports: () => false };
}

if (typeof g.CSSStyleSheet === "undefined") {
  g.CSSStyleSheet = class {
    replaceSync() {}
  };
}

if (typeof g.HTMLElement === "undefined") {
  g.HTMLElement = class HTMLElement {
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return true;
    }
    setAttribute() {}
    getAttribute() {
      return null;
    }
    hasAttribute() {
      return false;
    }
  };
}

if (typeof g.customElements === "undefined") {
  g.customElements = {
    define: () => {},
    get: () => undefined,
    whenDefined: () => Promise.resolve(g.HTMLElement),
  };
}
