import { describe, expect, it } from "@jest/globals";
import { expandTailwindShorthand } from "./shorthand"; // Import the function

describe("expandTailwindShorthand", () => {
  it("expands mx-4 to mr-4 ml-4", () => {
    expect(expandTailwindShorthand("mx-4")).toBe("mr-4 ml-4");
  });

  it("expands flex-initial to grow-0 shrink basis-auto", () => {
    expect(expandTailwindShorthand("flex-initial")).toBe(
      "grow-0 shrink basis-auto"
    );
  });

  it("returns the original class if not a shorthand", () => {
    expect(expandTailwindShorthand("bg-red-500")).toBe("bg-red-500");
  });

  it("handles classes without a modifier", () => {
    expect(expandTailwindShorthand("none")).toBe("grow-0 shrink-0 basis-auto");
  });

  it("handles dynamic values", () => {
    expect(expandTailwindShorthand("flex-1")).toBe("grow shrink basis-[0%]");
  });

  it("expands inset-x-4 to right-4 left-4", () => {
    expect(expandTailwindShorthand("inset-x-4")).toBe("right-4 left-4");
  });
});
