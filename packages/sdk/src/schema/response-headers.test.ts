import { describe, expect, test } from "vitest";
import { projectMeta } from "./pages";
import { customResponseHeaders } from "./response-headers";

describe("custom response headers", () => {
  test("preserves explicit removal, empty values, and legacy projects", () => {
    expect(projectMeta.parse({})).toEqual({});
    const headers = [
      {
        name: "Content-Security-Policy",
        value: "frame-ancestors https://example.com",
      },
      { name: "X-Frame-Options", value: null },
      { name: "X-Empty", value: "" },
    ];
    expect(projectMeta.parse({ customHeaders: headers }).customHeaders).toEqual(
      headers
    );
  });

  test.each([
    "",
    "Bad Name",
    "Bad:Name",
    "Bad\r\nName",
    "Trailing\n",
    "Trailing\r\n",
    "Héader",
  ])("rejects invalid header name %j", (name) =>
    expect(
      customResponseHeaders.safeParse([{ name, value: "value" }]).success
    ).toBe(false)
  );

  test.each([
    "Content-Length",
    "content-ENCODING",
    "Connection",
    "Transfer-Encoding",
    "Set-Cookie",
    "X-Webstudio-Removed-Headers",
    "X-Webstudio-Internal",
  ])("rejects setting or removing managed header %s", (name) => {
    for (const value of ["value", null]) {
      expect(customResponseHeaders.safeParse([{ name, value }]).success).toBe(
        false
      );
    }
  });

  test.each([
    "ok\r\nSet-Cookie: secret",
    "bad\nvalue",
    "trailing\n",
    "trailing\r\n",
    "bad\0value",
    "bad\x7fvalue",
    "💥",
  ])("rejects invalid header value %j", (value) =>
    expect(
      customResponseHeaders.safeParse([{ name: "X-Test", value }]).success
    ).toBe(false)
  );

  test("rejects conflicting names regardless of capitalization", () => {
    expect(
      customResponseHeaders.safeParse([
        { name: "X-Test", value: "one" },
        { name: "x-test", value: null },
      ]).success
    ).toBe(false);
  });

  test("enforces count, individual length, and total size limits", () => {
    expect(
      customResponseHeaders.safeParse(
        Array.from({ length: 51 }, (_, i) => ({ name: `X-${i}`, value: "" }))
      ).success
    ).toBe(false);
    expect(
      customResponseHeaders.safeParse([
        { name: "X-Test", value: "a".repeat(8193) },
      ]).success
    ).toBe(false);
    expect(
      customResponseHeaders.safeParse([{ name: "a".repeat(257), value: "" }])
        .success
    ).toBe(false);
    expect(
      customResponseHeaders.safeParse([
        { name: "X-One", value: "a".repeat(8192) },
        { name: "X-Two", value: "a".repeat(8192) },
      ]).success
    ).toBe(false);
  });
});
