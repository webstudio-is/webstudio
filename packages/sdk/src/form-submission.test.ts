import { expect, test } from "vitest";
import {
  getEnabledFormActions,
  isFormSubmission,
  validateFormSubmission,
} from "./form-submission";

test("enabled Actions preserve configured order", () => {
  const actions = [
    { dataSourceId: "third", enabled: true },
    { dataSourceId: "second", enabled: false },
    { dataSourceId: "first", enabled: true },
  ];
  expect(isFormSubmission(actions)).toBe(true);
  expect(validateFormSubmission(actions)).toBeUndefined();
  expect(getEnabledFormActions(actions)).toEqual(["third", "first"]);
});

test("all-disabled, duplicate and over-limit Actions are rejected", () => {
  expect(
    validateFormSubmission([{ dataSourceId: "first", enabled: false }])
  ).toBe("Add at least one action");
  expect(
    validateFormSubmission([
      { dataSourceId: "first", enabled: true },
      { dataSourceId: "first", enabled: false },
    ])
  ).toBe("Select each Resource only once");
  expect(
    validateFormSubmission(
      Array.from({ length: 11 }, (_, i) => ({
        dataSourceId: String(i),
        enabled: true,
      }))
    )
  ).toBe("Select no more than 10 Resource actions");
});

test("accepts 10 Resource actions", () => {
  const actions = Array.from({ length: 10 }, (_, i) => ({
    dataSourceId: String(i),
    enabled: true,
  }));
  expect(validateFormSubmission(actions)).toBeUndefined();
});

test.each([
  { destinations: ["first"] },
  "https://example.com/submit",
  [{ dataSourceId: "first" }],
  [{ dataSourceId: 1, enabled: true }],
  [{ dataSourceId: "first", enabled: "true" }],
  [null],
])("rejects malformed Action configuration: %j", (value) => {
  expect(isFormSubmission(value)).toBe(false);
});
