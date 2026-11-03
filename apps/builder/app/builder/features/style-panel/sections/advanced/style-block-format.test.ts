import { describe, expect, test } from "vitest";
import { generateStyleMap } from "@webstudio-is/css-engine";
import { parseStyleInput } from "~/builder/shared/css-editor/parse-style-input";
import { formatStyleBlock } from "./style-block-format";

const cssVars = new Map<string, string>();
const parse = (css: string) => parseStyleInput(css, cssVars).styleMap;

describe("formatStyleBlock", () => {
  test.each([
    ["margin: 0", "margin:"],
    ["margin: 0 1rem", "margin:"],
    ["padding: 1rem 2rem 3rem 4rem", "padding:"],
    ["gap: 8px", "gap:"],
    ["flex: 1 1 0%", "flex:"],
    ["border: 1px solid red", "border:"],
    ["border-radius: 10px 20px", "border-radius:"],
    ["overflow: hidden", "overflow:"],
    ["scroll-margin: 5px 10px", "scroll-margin:"],
    ["background: red", "background:"],
    ["animation: fade 1s ease-in 2", "animation:"],
    ["transition: opacity 1s ease-in", "transition:"],
  ])("compacts %s while preserving its parsed values", (input, shorthand) => {
    const styles = parse(input);
    const formatted = formatStyleBlock(styles);
    expect(
      formatted.split(";\n").some((line) => line.startsWith(shorthand))
    ).toBe(true);
    expect(parse(formatted)).toEqual(styles);
  });

  test("preserves unrelated declarations while compacting", () => {
    const styles = parse("color: red; margin: 0; padding: 1rem");
    const formatted = formatStyleBlock(styles);
    expect(formatted).toContain("color: red");
    expect(formatted).toContain("margin:");
    expect(formatted).toContain("padding:");
    expect(parse(formatted)).toEqual(styles);
  });

  test("keeps a declaration that is already stored as one property", () => {
    const styles = parse("color: red");
    expect(styles.size).toBe(1);
    expect(formatStyleBlock(styles)).toBe(generateStyleMap(styles));
  });

  test("leaves an incomplete shorthand group as longhands", () => {
    const styles = parse("margin-top: 0; margin-right: 0; margin-bottom: 0");
    const formatted = formatStyleBlock(styles);
    expect(formatted).not.toContain("margin:");
    expect(parse(formatted)).toEqual(styles);
  });

  test("leaves a group with a different side as longhands", () => {
    const styles = parse("margin: 0; margin-left: 2px");
    const formatted = formatStyleBlock(styles);
    expect(formatted).not.toContain("margin:");
    expect(parse(formatted)).toEqual(styles);
  });

  test("keeps custom declarations alongside a shorthand", () => {
    const styles = parse("--space: 8px; margin: 0");
    const formatted = formatStyleBlock(styles);
    expect(formatted).toContain("--space: 8px");
    expect(formatted).toContain("margin:");
    expect(parse(formatted)).toEqual(styles);
  });

  test("also compacts four explicitly entered equal longhands", () => {
    const styles = parse(
      "margin-top: 0; margin-right: 0; margin-bottom: 0; margin-left: 0"
    );
    const formatted = formatStyleBlock(styles);
    expect(formatted).toContain("margin:");
    expect(parse(formatted)).toEqual(styles);
  });

  test("does not combine values with different stored units", () => {
    const styles = parse(
      "margin-top: 0; margin-right: 0px; margin-bottom: 0; margin-left: 0"
    );
    const formatted = formatStyleBlock(styles);
    expect(formatted).not.toContain("margin:");
    expect(parse(formatted)).toEqual(styles);
  });

  test("does not turn a partial border into the full border shorthand", () => {
    const styles = parse(
      "border-top: 1px solid red; border-right: 1px solid red"
    );
    const formatted = formatStyleBlock(styles);
    expect(formatted).not.toContain("border: ");
    expect(parse(formatted)).toEqual(styles);
  });

  test("keeps an overlapping border image declaration", () => {
    const styles = parse(
      "border: 1px solid red; border-image-source: linear-gradient(red, blue)"
    );
    const formatted = formatStyleBlock(styles);
    expect(formatted).toContain("border-image-source:");
    expect(parse(formatted)).toEqual(styles);
  });

  test("keeps custom-property references when compacting", () => {
    const variables = new Map([["--space", "8px"]]);
    const styles = parseStyleInput("margin: var(--space)", variables).styleMap;
    const formatted = formatStyleBlock(styles, variables);
    expect(formatted).toContain("margin:");
    expect(parseStyleInput(formatted, variables).styleMap).toEqual(styles);
  });

  test("resolves a variable defined in the same style block", () => {
    const styles = parse("--space: 8px; margin: var(--space)");
    const formatted = formatStyleBlock(styles);
    expect(formatted).toContain("margin:");
    expect(parse(formatted)).toEqual(styles);
  });

  test("does not fold a value hidden from CSS text editing", () => {
    const styles = parse("margin: 0");
    const top = styles.get("margin-top")!;
    styles.set("margin-top", { ...top, hidden: true });
    const formatted = formatStyleBlock(styles);
    expect(formatted).toBe(generateStyleMap(styles));
  });

  test("preserves a layered background with an image", () => {
    const styles = parse(
      "background: url(example.png) center / cover no-repeat red"
    );
    expect(styles.size).toBeGreaterThan(1);
    const formatted = formatStyleBlock(styles);
    expect(parse(formatted)).toEqual(styles);
  });

  test("keeps the current longhand display when font values cannot round-trip", () => {
    const styles = parse("font: italic bold 16px/1.5 Arial");
    expect(formatStyleBlock(styles)).toBe(generateStyleMap(styles));
  });

  test("can compact an independent group beside a font value that already cannot round-trip", () => {
    const styles = parse("font: italic bold 16px/1.5 Arial; margin: 0");
    const formatted = formatStyleBlock(styles);
    expect(formatted).toContain("margin:");
    expect(parse(formatted)).toEqual(parse(generateStyleMap(styles)));
  });

  test("keeps its compact form after another save and render", () => {
    const styles = parse("margin: 0 1rem; border: 1px solid red");
    const formatted = formatStyleBlock(styles);
    expect(formatStyleBlock(parse(formatted))).toBe(formatted);
  });

  test("leaves an empty style block empty", () => {
    expect(formatStyleBlock(new Map())).toBe("");
  });
});
