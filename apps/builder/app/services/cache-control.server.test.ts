import { describe, expect, test } from "vitest";
import {
  appendVaryHeader,
  createPrivateNoStoreHeaders,
  privateNoStoreResponseHeaders,
} from "./cache-control.server";

describe("private no-store cache headers", () => {
  test("marks user-scoped responses as non-cacheable and cookie-varying", () => {
    expect(privateNoStoreResponseHeaders).toMatchObject({
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
      Vary: "Cookie",
    });
  });

  test("preserves unrelated headers while enforcing cache policy", () => {
    const headers = createPrivateNoStoreHeaders({
      "Cache-Control": "public, max-age=600",
      "Set-Cookie": "session=value",
    });

    expect(headers.get("Cache-Control")).toBe(
      privateNoStoreResponseHeaders["Cache-Control"]
    );
    expect(headers.get("Vary")).toBe(privateNoStoreResponseHeaders.Vary);
    expect(headers.get("Set-Cookie")).toBe("session=value");
  });

  test("preserves existing vary values while adding cookie", () => {
    const headers = createPrivateNoStoreHeaders({
      Vary: "Origin",
    });

    expect(headers.get("Vary")).toBe("Origin, Cookie");
  });

  test("does not duplicate vary values", () => {
    const headers = new Headers({
      Vary: "Origin, Cookie",
    });

    appendVaryHeader(headers, "Origin");
    appendVaryHeader(headers, "Cookie");

    expect(headers.get("Vary")).toBe("Origin, Cookie");
  });
});
