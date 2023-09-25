import { describe, expect, it } from "@jest/globals";
import { expandTailwindShorthand } from "./shorthand"; // Import the function

describe("expandTailwindShorthand", () => {
  it("should expand mx-4 to mr-4 ml-4", () => {
    expect(expandTailwindShorthand("mx-4")).toBe("mr-4 ml-4");
  });

  it("should expand flex-initial to grow-0 shrink basis-auto", () => {
    expect(expandTailwindShorthand("flex-initial")).toBe(
      "grow-0 shrink basis-auto"
    );
  });

  it("should return the original class if not a shorthand", () => {
    expect(expandTailwindShorthand("bg-red-500")).toBe("bg-red-500");
  });

  it("should handle classes without a modifier", () => {
    expect(expandTailwindShorthand("none")).toBe("grow-0 shrink-0 basis-auto");
  });

  it("should handle dynamic values", () => {
    expect(expandTailwindShorthand("flex-1")).toBe("grow shrink basis-[0%]");
  });

  it("should expand inset-x-4 to right-4 left-4", () => {
    expect(expandTailwindShorthand("inset-x-4")).toBe("right-4 left-4");
  });
});
