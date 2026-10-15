import { expect, test } from "vitest";
import {
  getFormActions,
  isFormSubmission,
  validateFormSubmission,
} from "./form-submission";

test("Actions preserve configured order and ignore legacy enabled keys", () => {
  const actions = [
    { dataSourceId: "third" },
    { dataSourceId: "second", enabled: false },
    { dataSourceId: "first" },
  ];
  expect(isFormSubmission(actions)).toBe(true);
  expect(validateFormSubmission(actions)).toBeUndefined();
  expect(getFormActions(actions)).toEqual(["third", "second", "first"]);
});

test("empty, duplicate and over-limit Actions are rejected", () => {
  expect(validateFormSubmission([{ dataSourceId: "first" }])).toBeUndefined();
  expect(validateFormSubmission([])).toBe(
    "Select at least one Resource action"
  );
  expect(
    validateFormSubmission([
      { dataSourceId: "first" },
      { dataSourceId: "first" },
    ])
  ).toBe("Select each Resource only once");
  expect(
    validateFormSubmission(
      Array.from({ length: 11 }, (_, i) => ({
        dataSourceId: String(i),
      }))
    )
  ).toBe("Select no more than 10 Resource actions");
});

test("accepts 10 Resource actions", () => {
  const actions = Array.from({ length: 10 }, (_, i) => ({
    dataSourceId: String(i),
  }));
  expect(validateFormSubmission(actions)).toBeUndefined();
});

test.each([
  { destinations: ["first"] },
  "https://example.com/submit",
  [{ dataSourceId: 1 }],
  [{}],
  [null],
])("rejects malformed Action configuration: %j", (value) => {
  expect(isFormSubmission(value)).toBe(false);
});
