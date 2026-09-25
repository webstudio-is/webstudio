import { describe, expect, test } from "vitest";
import { projectMeta } from "./pages";
import {
  customResponseHeader,
  customResponseHeaders,
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

  test.each(responseHeaderDefinitions)(
    "fallback $name can be omitted in settings",
    ({ name }) => {
      expect(
        customResponseHeader.safeParse({ name, value: null }).success
      ).toBe(true);
      expect(
        projectMeta.safeParse({ customHeaders: [{ name, value: null }] })
          .success
      ).toBe(true);
      expect(hasCustomResponseHeaders([{ name, value: null }])).toBe(false);
    }
  );

  test.each([
    "X-Powered-By",
    "x-powered-by",
    "X-Content-Type-Options",
    "x-content-type-options",
    "Strict-Transport-Security",
    "strict-transport-security",
  ])("rejects dispatcher-owned header %j", (name) => {
    for (const value of ["value", null]) {
      expect(customResponseHeaders.safeParse([{ name, value }]).success).toBe(
        false
      );
    }
  });

  test.each(forbiddenCustomResponseHeaderNames)(
    "rejects forbidden custom response header %s, including case variants and removal rules",
    (name) => {
      for (const value of ["value", null]) {
        expect(customResponseHeader.safeParse({ name, value }).success).toBe(
          false
        );
        expect(
          customResponseHeader.safeParse({ name: name.toUpperCase(), value })
            .success
        ).toBe(false);
      }
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
        { name: "x-frame-options", value: null },
      ]).success
    ).toBe(false);
    expect(
      customResponseHeaders.safeParse([
        { name: "Content-Security-Policy", value: "a".repeat(8193) },
      ]).success
    ).toBe(false);
  });
});
