// Polyfill browser globals needed by hdr-color-input at module load time.
// These are stubs — just enough for the module to be imported without throwing.

if (typeof globalThis.CSS === "undefined") {
  (globalThis as typeof globalThis & { CSS: unknown }).CSS = {
    supports: () => false,
  };
}

if (typeof globalThis.CSSStyleSheet === "undefined") {
  (globalThis as typeof globalThis & { CSSStyleSheet: unknown }).CSSStyleSheet =
    class {
      replaceSync() {}
    };
}

if (typeof globalThis.HTMLElement === "undefined") {
  (globalThis as typeof globalThis & { HTMLElement: unknown }).HTMLElement =
    class HTMLElement {
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

if (typeof globalThis.customElements === "undefined") {
  (
    globalThis as typeof globalThis & { customElements: unknown }
  ).customElements = {
    define: () => {},
    get: () => undefined,
    whenDefined: () => Promise.resolve(undefined),
  };
}
