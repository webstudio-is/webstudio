import { describe, expect, test } from "vitest";
import { toPascalCase } from "./keyword-utils";

describe("keyword-utils", () => {
  test("toPascalCase", () => {
    expect(toPascalCase("box")).toBe("Box");
    expect(toPascalCase("border-box")).toBe("Border Box");
    expect(toPascalCase("-border-box")).toBe("Border Box");
  });
});
