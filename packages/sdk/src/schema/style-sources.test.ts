import { describe, expect, test } from "vitest";
import { StyleSource } from "./style-sources";

describe("StyleSource", () => {
  test("parses unlocked tokens without locked field", () => {
    expect(
      StyleSource.parse({
        id: "token",
        type: "token",
        name: "Token",
      })
    ).toEqual({
      id: "token",
      type: "token",
      name: "Token",
    });
  });

  test("parses locked tokens", () => {
    expect(
      StyleSource.parse({
        id: "token",
        type: "token",
        name: "Token",
        locked: true,
      })
    ).toEqual({
      id: "token",
      type: "token",
      name: "Token",
      locked: true,
    });
  });
});
