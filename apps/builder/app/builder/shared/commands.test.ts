import { describe, expect, test } from "vitest";
import { __testing__ } from "./commands";

const { canRunDesignModeCommand, guardDesignModeCommand } = __testing__;

describe("canRunDesignModeCommand", () => {
  test("keeps design commands design-only", () => {
    expect(canRunDesignModeCommand({ isDesignMode: true })).toBe(true);
    expect(canRunDesignModeCommand({ isDesignMode: false })).toBe(false);
  });
});

describe("guardDesignModeCommand", () => {
  test("allows design mode commands without showing a message", () => {
    const messages: string[] = [];

    expect(
      guardDesignModeCommand({
        isDesignMode: true,
        message: "Blocked",
        toastInfo: (message) => messages.push(message),
      })
    ).toBe(true);
    expect(messages).toEqual([]);
  });

  test("blocks non-design mode commands and reports a message", () => {
    const messages: string[] = [];

    expect(
      guardDesignModeCommand({
        isDesignMode: false,
        message: "Blocked",
        toastInfo: (message) => messages.push(message),
      })
    ).toBe(false);
    expect(messages).toEqual(["Blocked"]);
  });
});
