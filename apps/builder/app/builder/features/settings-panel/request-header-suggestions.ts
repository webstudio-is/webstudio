export const requestHeaderNames = [
  "Accept",
  "Accept-Language",
  "Authorization",
  "Cache-Control",
  "Content-Type",
  "Idempotency-Key",
  "If-Match",
  "If-None-Match",
  "Prefer",
  "X-API-Key",
  "X-Requested-With",
] as const;

const requestHeaderValues: Record<string, readonly string[]> = {
  accept: ["application/json", "text/plain", "application/xml", "*/*"],
  "cache-control": ["no-cache", "no-store", "max-age=0"],
  "content-type": [
    "application/json",
    "application/x-www-form-urlencoded",
    "text/plain",
  ],
  prefer: ["respond-async", "return=minimal", "return=representation"],
  "x-requested-with": ["XMLHttpRequest"],
};

export const getRequestHeaderValueSuggestions = (name: string) =>
  requestHeaderValues[name.trim().toLowerCase()] ?? [];
