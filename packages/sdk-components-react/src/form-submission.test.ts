import { expect, test } from "vitest";
import { getBrowserInfo } from "./form-submission";
import { validateFormSubmission } from "@webstudio-is/sdk";

test("limits Resource destinations and rejects empty managed mode", () => {
  expect(
    validateFormSubmission({ mode: "native", destinations: [] })
  ).toBeUndefined();
  expect(
    validateFormSubmission({ mode: "resources", destinations: [] })
  ).toMatch(/at least one/);
  expect(
    validateFormSubmission({
      mode: "resources",
      destinations: ["a", "b", "c", "d", "e"],
    })
  ).toBeUndefined();
  expect(
    validateFormSubmission({
      mode: "resources",
      destinations: ["a", "b", "c", "d", "e", "f"],
    })
  ).toMatch(/no more than 5/);
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
});
