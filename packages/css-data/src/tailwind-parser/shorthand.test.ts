import { describe, expect, test } from "@jest/globals";
import { expandTailwindShorthand } from "./shorthand"; // Import the function

describe("expandTailwindShorthand", () => {
  test("expand mx-4 to mr-4 ml-4", () => {
    expect(expandTailwindShorthand("mx-4")).toBe("mr-4 ml-4");
  });

  test("do not expand mb-4", () => {
    expect(expandTailwindShorthand("mb-4")).toBe("mb-4");
  });

  test("expand flex-initial to grow-0 shrink basis-auto", () => {
    expect(expandTailwindShorthand("flex-initial")).toBe(
      "grow-0 shrink basis-auto"
    );
  });

  test("return the original class if not a shorthand", () => {
    expect(expandTailwindShorthand("bg-red-500")).toBe("bg-red-500");
  });

  test("handle classes without a modifier", () => {
    expect(expandTailwindShorthand("flex-none")).toBe(
      "grow-0 shrink-0 basis-auto"
    );
  });

  test("handle dynamic values", () => {
    expect(expandTailwindShorthand("flex-1")).toBe("grow shrink basis-[0%]");
  });

  test("expand inset-x-4 to right-4 left-4", () => {
    expect(expandTailwindShorthand("inset-x-4")).toBe("right-4 left-4");
  });

  test("do not expand border color", () => {
    expect(expandTailwindShorthand("border-sky-500")).toBe(
      "border-t-sky-500 border-r-sky-500 border-b-sky-500 border-l-sky-500"
    );
  });

  test("expand border width", () => {
    expect(expandTailwindShorthand("border border-sky-500")).toBe(
      "border-t border-r border-b border-l border-t-sky-500 border-r-sky-500 border-b-sky-500 border-l-sky-500"
    );
  });

  test("expand rounded-lg", () => {
    expect(expandTailwindShorthand("rounded-lg")).toBe(
      "rounded-tl-lg rounded-tr-lg rounded-br-lg rounded-bl-lg"
    );
  });

  test("do not expand rounded-tl-lg", () => {
    expect(expandTailwindShorthand("rounded-tl-lg")).toBe("rounded-tl-lg");
  });

  test("do not expand border-r", () => {
    expect(expandTailwindShorthand("border-r")).toBe("border-r");
  });
});
