import { describe, expect, test } from "vitest";
import { __testing__ } from "./url";

describe("email url control value", () => {
  test("preserves subject without email", () => {
    expect(__testing__.emailToProp({ email: "", subject: "Hello" })).toEqual(
      "mailto:?subject=Hello"
    );
    expect(__testing__.propToEmail("mailto:?subject=Hello")).toEqual({
      email: "",
      subject: "Hello",
    });
  });

  test("clears value when email and subject are empty", () => {
    expect(__testing__.emailToProp({ email: "", subject: "" })).toEqual("");
  });
});
