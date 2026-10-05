import { expect, test } from "vitest";
import {
  getEnabledFormDestinations,
  isFormSubmission,
  validateFormSubmission,
} from "./form-submission";

test("disabled destinations remain selected but do not execute", () => {
  const submission = {
    destinations: ["first", "second", "third"],
    disabledDestinations: ["second"],
  };
  expect(isFormSubmission(submission)).toBe(true);
  expect(validateFormSubmission(submission)).toBeUndefined();
  expect(getEnabledFormDestinations(submission)).toEqual(["first", "third"]);
});

test("all-disabled and duplicate destinations are rejected", () => {
  expect(
    validateFormSubmission({
      destinations: ["first"],
      disabledDestinations: ["first"],
    })
  ).toBe("Select at least one Resource destination");
  expect(validateFormSubmission({ destinations: ["first", "first"] })).toBe(
    "Select each Resource only once"
  );
  expect(
    validateFormSubmission({
      destinations: ["first"],
      disabledDestinations: ["other"],
    })
  ).toBe("Disabled Resource destinations are invalid");
});
