import { describe, expect, test } from "vitest";
import { styleSource } from "./style-sources";

describe("StyleSource", () => {
  test("parses unlocked tokens without locked field", () => {
    expect(
      styleSource.parse({
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
      styleSource.parse({
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
