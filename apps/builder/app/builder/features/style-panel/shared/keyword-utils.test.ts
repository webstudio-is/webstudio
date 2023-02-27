import { describe, expect, test } from "@jest/globals";
import { toPascalCase } from "./keyword-utils";

describe("keyword-utils", () => {
  test("toPascalCase", () => {
    expect(toPascalCase("box")).toBe("Box");
    expect(toPascalCase("border-box")).toBe("Border Box");
    expect(toPascalCase("-border-box")).toBe("Border Box");
  });
});
