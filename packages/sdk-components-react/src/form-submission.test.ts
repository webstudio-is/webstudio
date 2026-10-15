import { expect, test } from "vitest";
import { isFormSubmission, validateFormSubmission } from "@webstudio-is/sdk";

test("requires and limits Resource actions", () => {
  expect(validateFormSubmission([])).toMatch(/at least one/);
  const actions = Array.from({ length: 10 }, (_, index) => ({
    dataSourceId: String(index),
  }));
  expect(validateFormSubmission(actions)).toBeUndefined();
  expect(validateFormSubmission([...actions, { dataSourceId: "extra" }])).toBe(
    "Select no more than 10 Resource actions"
  );
});

test("requires an Action array with data source IDs", () => {
  expect(isFormSubmission({ destinations: ["resource"] })).toBe(false);
  expect(isFormSubmission([{ dataSourceId: "resource" }])).toBe(true);
});
