import { expect, test } from "vitest";
import { getBrowserInfo } from "./form-submission";
import { isFormSubmission, validateFormSubmission } from "@webstudio-is/sdk";

test("requires and limits Resource destinations", () => {
  expect(validateFormSubmission([])).toMatch(/at least one/);
  expect(
    validateFormSubmission([
      { dataSourceId: "a", enabled: true },
      { dataSourceId: "b", enabled: true },
      { dataSourceId: "c", enabled: true },
      { dataSourceId: "d", enabled: true },
      { dataSourceId: "e", enabled: true },
    ])
  ).toBeUndefined();
  expect(
    validateFormSubmission([
      { dataSourceId: "a", enabled: true },
      { dataSourceId: "b", enabled: true },
      { dataSourceId: "c", enabled: true },
      { dataSourceId: "d", enabled: true },
      { dataSourceId: "e", enabled: true },
      { dataSourceId: "f", enabled: true },
    ])
  ).toMatch(/no more than 5/);
});

test("requires an Action array with explicit enabled state", () => {
  expect(isFormSubmission({ destinations: ["resource"] })).toBe(false);
  expect(isFormSubmission([{ dataSourceId: "resource", enabled: true }])).toBe(
    true
  );
});

test("browser info excludes cookies, auth, and untrusted IP headers", () => {
  const request = new Request("https://example.com", {
    headers: {
      "user-agent": "Example Browser",
      "accept-language": "en-US",
      referer: "https://example.com/from",
      cookie: "session=secret",
      authorization: "Bearer secret",
      "x-forwarded-for": "203.0.113.1",
    },
  });
  expect(getBrowserInfo({ request, trustedIp: "198.51.100.2" })).toEqual({
    ip: "198.51.100.2",
    userAgent: "Example Browser",
    language: "en-US",
    referrer: "https://example.com/from",
  });
  expect(getBrowserInfo({ request })).toEqual({
    userAgent: "Example Browser",
    language: "en-US",
    referrer: "https://example.com/from",
  });
});
