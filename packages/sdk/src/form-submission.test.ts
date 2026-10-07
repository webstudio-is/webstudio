import { expect, test } from "vitest";
import {
  getEnabledFormDestinations,
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
  expect(getEnabledFormDestinations(actions)).toEqual(["third", "first"]);
});

test("all-disabled, duplicate and excessive Actions are rejected", () => {
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
      Array.from({ length: 6 }, (_, i) => ({
        dataSourceId: String(i),
        enabled: true,
      }))
    )
  ).toBe("Select no more than 5 Resource destinations");
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
