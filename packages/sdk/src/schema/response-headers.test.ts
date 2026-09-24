import { describe, expect, test } from "vitest";
import { projectMeta } from "./pages";
import {
  customResponseHeader,
  customResponseHeaders,
  getResponseHeaders,
  hasCustomResponseHeaders,
  responseHeaderDefinitions,
} from "./response-headers";

describe("response header settings", () => {
  test("legacy and empty settings resolve to defaults without a Pro customization", () => {
    expect(projectMeta.parse({})).toEqual({});
    expect(getResponseHeaders()).toEqual(
      responseHeaderDefinitions.map(({ name, defaultValue }) => ({
        name,
        value: defaultValue,
      }))
    );
    expect(hasCustomResponseHeaders()).toBe(false);
    expect(hasCustomResponseHeaders(getResponseHeaders())).toBe(false);
    expect(
      hasCustomResponseHeaders(
        getResponseHeaders().map(({ name, value }) => ({
          name: name.toLowerCase(),
          value: ` ${value} `,
        }))
      )
    ).toBe(false);
  });

  test("supports edits and optional removal, preserving other defaults", () => {
    const headers = [
      {
        name: "content-security-policy",
        value: "frame-ancestors https://example.com",
      },
      { name: "X-Frame-Options", value: null },
    ];
    expect(customResponseHeaders.parse(headers)).toEqual(headers);
    expect(getResponseHeaders(headers)).toEqual(
      expect.arrayContaining([
        { name: "Content-Security-Policy", value: headers[0].value },
        { name: "X-Frame-Options", value: null },
        { name: "X-Content-Type-Options", value: "nosniff" },
      ])
    );
    expect(hasCustomResponseHeaders(headers)).toBe(true);
    expect(hasCustomResponseHeaders([headers[1]])).toBe(true);
  });

  test("supports route rules while preserving site-wide defaults", () => {
    const rules = [
      { route: "/docs/*", name: "Referrer-Policy", value: "no-referrer" },
      { route: "/private/:id", name: "Referrer-Policy", value: "same-origin" },
    ];
    expect(customResponseHeaders.parse(rules)).toEqual(rules);
    expect(getResponseHeaders(rules)).toContainEqual({
      name: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    });
    expect(hasCustomResponseHeaders(rules)).toBe(true);
    expect(
      hasCustomResponseHeaders([
        {
          route: "/",
          name: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
      ])
    ).toBe(false);
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
    expect(
      customResponseHeader.safeParse({
        route: "/private/*",
        name: "X-Frame-Options",
        value: null,
      }).success
    ).toBe(true);
  });

  test.each(responseHeaderDefinitions.filter((header) => header.required))(
    "required $name cannot be removed or emptied",
    ({ name }) => {
      for (const value of [null, "", " \t "]) {
        expect(
          customResponseHeader.safeParse({ name: name.toLowerCase(), value })
            .success
        ).toBe(false);
        expect(
          projectMeta.safeParse({ customHeaders: [{ name, value }] }).success
        ).toBe(false);
      }
      expect(
        customResponseHeaders.safeParse([{ name, value: "custom value" }])
          .success
      ).toBe(true);
    }
  );

  test.each([
    "X-Powered-By",
    "Cache-Control",
    "Content-Length",
    "Set-Cookie",
    "X-Test",
    "X-Webstudio-Removed-Headers",
    "",
    "Content-Security-Policy\n",
  ])("rejects unsupported header %j", (name) => {
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
    expect(
      customResponseHeaders.safeParse([
        { name: "Content-Security-Policy", value: "a".repeat(8192) },
        { name: "Referrer-Policy", value: "a".repeat(8192) },
      ]).success
    ).toBe(false);
  });
});
