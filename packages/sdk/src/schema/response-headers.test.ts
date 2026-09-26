import { describe, expect, test } from "vitest";
import { projectMeta } from "./pages";
import {
  customResponseHeader,
  customResponseHeaderKey,
  customResponseHeaders,
  editCustomResponseHeaders,
  hasCustomResponseHeaders,
  responseHeaderDefinitions,
  forbiddenCustomResponseHeaderNames,
} from "./response-headers";

describe("response header settings", () => {
  test("settings start empty and explicit fallback values are not Pro customizations", () => {
    expect(projectMeta.parse({})).toEqual({});
    expect(hasCustomResponseHeaders()).toBe(false);
    expect(
      hasCustomResponseHeaders(
        responseHeaderDefinitions.map(({ name, defaultValue }) => ({
          name,
          value: defaultValue,
        }))
      )
    ).toBe(false);
  });

  test("supports custom values and routes", () => {
    const headers = [
      {
        name: "Content-Security-Policy",
        value: "frame-ancestors https://example.com",
      },
      { route: "/docs/*", name: "Referrer-Policy", value: "no-referrer" },
      { name: "Cache-Control", value: "public, max-age=60" },
    ];
    expect(customResponseHeaders.parse(headers)).toEqual(headers);
    expect(hasCustomResponseHeaders(headers)).toBe(true);
    expect(
      customResponseHeaders.safeParse([
        { route: "/docs/*", name: "Referrer-Policy", value: "no-referrer" },
        { route: "/docs/*", name: "referrer-policy", value: "same-origin" },
      ]).success
    ).toBe(false);
    expect(
      customResponseHeader.safeParse({
        route: "/docs/*/bad",
        name: "Referrer-Policy",
        value: "no-referrer",
      }).success
    ).toBe(false);
  });

  test("edits rules by route and case-insensitive name", () => {
    const headers = [
      { name: "Cache-Control", value: "all paths" },
      { route: "/", name: "Cache-Control", value: "root only" },
    ];
    const updated = editCustomResponseHeaders(
      headers,
      customResponseHeaderKey({ name: "cache-control" }),
      { name: "cache-control", value: "updated" }
    );
    expect(updated).toEqual([
      { name: "cache-control", value: "updated" },
      headers[1],
    ]);
    expect(
      editCustomResponseHeaders(
        updated,
        customResponseHeaderKey({ route: "/", name: "CACHE-CONTROL" })
      )
    ).toEqual([{ name: "cache-control", value: "updated" }]);
    expect(() =>
      editCustomResponseHeaders(headers, customResponseHeaderKey(headers[0]), {
        name: "Set-Cookie",
        value: "session=secret",
      })
    ).toThrow();
  });

  test("a rule requires a nonempty string value", () => {
    for (const value of [null, "", "  "]) {
      expect(
        customResponseHeader.safeParse({ name: "X-Frame-Options", value })
          .success
      ).toBe(false);
    }
  });

  test.each([
    "X-Powered-By",
    "x-powered-by",
    "X-Content-Type-Options",
    "x-content-type-options",
    "Strict-Transport-Security",
    "strict-transport-security",
  ])("rejects dispatcher-owned header %j", (name) => {
    expect(
      customResponseHeaders.safeParse([{ name, value: "value" }]).success
    ).toBe(false);
  });

  test.each(forbiddenCustomResponseHeaderNames)(
    "rejects forbidden custom response header %s, including case variants",
    (name) => {
      expect(
        customResponseHeader.safeParse({ name, value: "value" }).success
      ).toBe(false);
      expect(
        customResponseHeader.safeParse({
          name: name.toUpperCase(),
          value: "value",
        }).success
      ).toBe(false);
    }
  );

  test.each(["", "Bad Header", "X:Test", "X-💥", "Content-Security-Policy\n"])(
    "rejects invalid header name %j",
    (name) => {
      expect(
        customResponseHeader.safeParse({ name, value: "value" }).success
      ).toBe(false);
    }
  );

  test.each([
    "",
    " \t ",
    "ok\r\nSet-Cookie: secret",
    "bad\nvalue",
    "bad\0value",
    "bad\x7fvalue",
    "💥",
  ])("rejects invalid header value %j", (value) => {
    expect(
      customResponseHeaders.safeParse([
        { name: "Content-Security-Policy", value },
      ]).success
    ).toBe(false);
  });

  test("rejects case-insensitive duplicates and excessive values", () => {
    expect(
      customResponseHeaders.safeParse([
        { name: "X-Frame-Options", value: "DENY" },
        { name: "x-frame-options", value: "SAMEORIGIN" },
      ]).success
    ).toBe(false);
    expect(
      customResponseHeaders.safeParse([
        { name: "Content-Security-Policy", value: "a".repeat(8193) },
      ]).success
    ).toBe(false);
  });
});
