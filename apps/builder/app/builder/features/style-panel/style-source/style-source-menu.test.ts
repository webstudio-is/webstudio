import { describe, expect, test } from "vitest";
import { __testing__ } from "./style-source-menu";

const { canEditStyleSourceStyles } = __testing__;

describe("canEditStyleSourceStyles", () => {
  test("allows style editing for local and unlocked token sources", () => {
    expect(
      canEditStyleSourceStyles({
        id: "local",
        label: "Local",
        disabled: false,
        source: "local",
        locked: false,
        states: [],
      })
    ).toBe(true);

    expect(
      canEditStyleSourceStyles({
        id: "token",
        label: "Token",
        disabled: false,
        source: "token",
        locked: false,
        states: [],
      })
    ).toBe(true);
  });

  test("hides style editing options for locked tokens", () => {
    expect(
      canEditStyleSourceStyles({
        id: "token",
        label: "Token",
        disabled: false,
        source: "token",
        locked: true,
        states: [],
      })
    ).toBe(false);
  });
});
