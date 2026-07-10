import { describe, expect, test } from "vitest";
import { validateBasicAuthCredentials } from "./auth";

describe("validateBasicAuthCredentials", () => {
  test("accepts valid login and password", () => {
    expect(
      validateBasicAuthCredentials({ login: "admin", password: "secret" })
    ).toBeUndefined();
  });

  test("returns field errors for invalid credentials", () => {
    expect(
      validateBasicAuthCredentials({ login: "admin:root", password: "" })
    ).toEqual({
      login: ["Login can't contain a colon"],
      password: ["Password is required"],
    });
  });
});
