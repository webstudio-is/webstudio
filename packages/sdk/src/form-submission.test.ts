import { expect, test } from "vitest";
import {
  getEnabledFormActions,
  getFormActions,
  isFormSubmission,
  noEnabledFormActionMessage,
  validateFormSubmission,
} from "./form-submission";

test("enabled Actions preserve configured order without running legacy disabled Actions", () => {
  const actions = [
    { dataSourceId: "third", enabled: true },
    { dataSourceId: "second", enabled: false },
    { dataSourceId: "first", enabled: true },
  ];
  expect(isFormSubmission(actions)).toBe(true);
  expect(validateFormSubmission(actions)).toBeUndefined();
  expect(getFormActions(actions)).toEqual(["third", "first"]);
  expect(getEnabledFormActions(actions)).toEqual(["third", "first"]);
});

test("retains the legacy validation message export", () => {
  expect(noEnabledFormActionMessage).toBe("Enable at least one action");
});

test("empty, duplicate and over-limit Actions are rejected", () => {
  expect(
    validateFormSubmission([{ dataSourceId: "first", enabled: false }])
  ).toBeUndefined();
  expect(validateFormSubmission([])).toBe(
    "Select at least one Resource action"
  );
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
