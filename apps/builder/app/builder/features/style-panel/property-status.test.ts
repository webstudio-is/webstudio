import { describe, expect, test } from "vitest";
import { getPropertyStatusDetails } from "./property-status";

describe("getPropertyStatusDetails", () => {
  test.each([
    ["anchor-name", "experimental"],
    ["-webkit-tap-highlight-color", "nonstandard"],
    ["clip", "obsolete"],
  ])("describes the %s property as %s", (property, status) => {
    expect(getPropertyStatusDetails(property)).toMatchObject({ status });
    expect(getPropertyStatusDetails(property)?.mdnUrl).toContain(
      "developer.mozilla.org"
    );
  });

  test.each(["color", "unknown-property"])(
    "does not warn for %s",
    (property) => {
      expect(getPropertyStatusDetails(property)).toBeUndefined();
    }
  );
});
