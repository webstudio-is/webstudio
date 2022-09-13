import fetch from "node-fetch";

if (globalThis.fetch === undefined) {
  // @ts-expect-error node-fetch doesn't implement a complete spec
  globalThis.fetch = fetch;
}
