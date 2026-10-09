import { expect, test } from "vitest";
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
