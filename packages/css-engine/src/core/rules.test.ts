import { describe, expect, test } from "vitest";
import { MediaRule, PlaintextRule } from "./rules";

describe("MediaRule with custom conditions", () => {
  test("generates media query with custom condition only", () => {
    const mediaRule = new MediaRule("breakpoint1", {
      condition: "orientation:portrait",
    });
    const plainRule = new PlaintextRule("  .test { color: red; }");
    mediaRule.insertRule(plainRule);

    const css = mediaRule.cssText;
    expect(css).toContain("@media all and (orientation:portrait)");
    expect(css).toContain("color: red");
  });

  test("generates media query with multiple conditions", () => {
    const mediaRule = new MediaRule("breakpoint2", {
      condition: "orientation:portrait and hover:hover",
    });
    const plainRule = new PlaintextRule("  .test { color: blue; }");
    mediaRule.insertRule(plainRule);

    const css = mediaRule.cssText;
    expect(css).toContain(
      "@media all and (orientation:portrait and hover:hover)"
    );
    expect(css).toContain("color: blue");
  });

  test("generates media query with hover condition", () => {
    const mediaRule = new MediaRule("breakpoint3", {
      condition: "hover:hover",
    });
    const plainRule = new PlaintextRule("  .test { cursor: pointer; }");
    mediaRule.insertRule(plainRule);

    const css = mediaRule.cssText;
    expect(css).toContain("@media all and (hover:hover)");
    expect(css).toContain("cursor: pointer");
  });

  test("generates media query with prefers-color-scheme condition", () => {
    const mediaRule = new MediaRule("breakpoint4", {
      condition: "prefers-color-scheme:dark",
    });
    const plainRule = new PlaintextRule("  .test { background: black; }");
    mediaRule.insertRule(plainRule);

    const css = mediaRule.cssText;
    expect(css).toContain("@media all and (prefers-color-scheme:dark)");
    expect(css).toContain("background: black");
  });

  test("prefers condition over width when both present", () => {
    // Note: In practice, condition and minWidth/maxWidth are mutually exclusive
    // (enforced by schema validation). This test verifies the precedence logic only.
    const mediaRule = new MediaRule("breakpoint5", {
      condition: "orientation:portrait",
      minWidth: 768,
    });
    const plainRule = new PlaintextRule("  .test { color: red; }");
    mediaRule.insertRule(plainRule);

    const css = mediaRule.cssText;
    expect(css).toContain("@media all and (orientation:portrait)");
    expect(css).not.toContain("min-width");
  });

  test("generates media query with minWidth when no condition", () => {
    const mediaRule = new MediaRule("breakpoint6", {
      minWidth: 768,
    });
    const plainRule = new PlaintextRule("  .test { color: red; }");
    mediaRule.insertRule(plainRule);

    const css = mediaRule.cssText;
    expect(css).toContain("@media all and (min-width: 768px)");
    expect(css).not.toContain("orientation");
  });

  test("generates media query with maxWidth when no condition", () => {
    const mediaRule = new MediaRule("breakpoint7", {
      maxWidth: 1024,
    });
    const plainRule = new PlaintextRule("  .test { color: green; }");
    mediaRule.insertRule(plainRule);

    const css = mediaRule.cssText;
    expect(css).toContain("@media all and (max-width: 1024px)");
  });

  test("generates base media query when no condition or width", () => {
    const mediaRule = new MediaRule("breakpoint8", {});
    const plainRule = new PlaintextRule("  .test { color: black; }");
    mediaRule.insertRule(plainRule);

    const css = mediaRule.cssText;
    expect(css).toContain("@media all");
    expect(css).not.toContain("min-width");
    expect(css).not.toContain("max-width");
    expect(css).not.toContain("orientation");
  });
});
