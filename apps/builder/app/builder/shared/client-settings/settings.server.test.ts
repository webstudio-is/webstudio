import { describe, expect, test } from "vitest";
import { getSetting } from "./settings";

describe("client settings server import", () => {
  test("does not access browser globals during SSR", () => {
    expect(getSetting("colorScheme")).toBe("system");
  });
});
