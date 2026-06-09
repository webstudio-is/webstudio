import { describe, expect, test } from "vitest";
import { __testing__ } from "./url";

const { emailToProp, propToEmail } = __testing__;

describe("email url control value", () => {
  test("preserves subject without email", () => {
    expect(emailToProp({ email: "", subject: "Hello" })).toEqual(
      "mailto:?subject=Hello"
    );
    expect(propToEmail("mailto:?subject=Hello")).toEqual({
      email: "",
      subject: "Hello",
    });
  });

  test("clears value when email and subject are empty", () => {
    expect(emailToProp({ email: "", subject: "" })).toEqual("");
  });
});
