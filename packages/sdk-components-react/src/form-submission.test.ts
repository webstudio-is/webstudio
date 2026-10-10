import { expect, test } from "vitest";
import { isFormSubmission, validateFormSubmission } from "@webstudio-is/sdk";

test("requires and limits Resource actions", () => {
  expect(validateFormSubmission([])).toMatch(/at least one/);
  const actions = Array.from({ length: 10 }, (_, index) => ({
    dataSourceId: String(index),
    enabled: true,
  }));
  expect(validateFormSubmission(actions)).toBeUndefined();
  expect(
    validateFormSubmission([
      ...actions,
      { dataSourceId: "extra", enabled: true },
    ])
  ).toBe("Select no more than 10 Resource actions");
});

test("requires an Action array with explicit enabled state", () => {
  expect(isFormSubmission({ destinations: ["resource"] })).toBe(false);
  expect(isFormSubmission([{ dataSourceId: "resource", enabled: true }])).toBe(
    true
  );
});
