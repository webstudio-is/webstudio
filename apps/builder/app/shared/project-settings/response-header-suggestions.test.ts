import { expect, test } from "vitest";
import {
  getResponseHeaderName,
  getResponseHeaderValueSuggestions,
  responseHeaderNames,
} from "./response-header-suggestions";

test("suggests response headers but excludes platform-owned names", () => {
  expect(responseHeaderNames).toContain("Content-Security-Policy");
  expect(responseHeaderNames).toContain("Access-Control-Allow-Origin");
  expect(responseHeaderNames).not.toContain("X-Powered-By");
  expect(responseHeaderNames).not.toContain("X-Content-Type-Options");
  expect(responseHeaderNames).not.toContain("Strict-Transport-Security");
  expect(getResponseHeaderName("referrer-policy")).toBe("Referrer-Policy");
  expect(getResponseHeaderName("X-Custom-Header")).toBeUndefined();
});

test("suggests values for the selected header without restricting custom values", () => {
  expect(getResponseHeaderValueSuggestions(" cache-control ")).toContain(
    "no-store"
  );
  expect(getResponseHeaderValueSuggestions("cache-control")).not.toContain(
    "SAMEORIGIN"
  );
  expect(getResponseHeaderValueSuggestions("x-frame-options")).toContain(
    "SAMEORIGIN"
  );
  expect(getResponseHeaderValueSuggestions("X-Custom-Header")).toEqual([]);
});
