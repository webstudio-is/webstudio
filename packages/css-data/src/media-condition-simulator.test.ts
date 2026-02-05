/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import {
  simulateMediaCondition,
  parseMediaCondition,
  mediaQueryMatchesValue,
  type SimulatorState,
} from "./media-condition-simulator";

describe("simulateMediaCondition", () => {
  let styleElement: HTMLStyleElement;
  let state: SimulatorState;

  beforeEach(() => {
    styleElement = document.createElement("style");
    document.head.appendChild(styleElement);
    state = {
      originalMediaTexts: new WeakMap(),
      modifiedRules: new Set(),
    };
  });

  afterEach(() => {
    styleElement.remove();
  });

  test("modifies matching media rules to always apply", () => {
    styleElement.textContent = `
      @media (prefers-color-scheme: dark) {
        body { background: black; }
      }
    `;

    simulateMediaCondition(document, "prefers-color-scheme:dark", state);

    const rule = document.styleSheets[0].cssRules[0] as CSSMediaRule;
    expect(rule.media.mediaText).toBe("all");
  });

  test("modifies non-matching media rules to never apply", () => {
    styleElement.textContent = `
      @media (prefers-color-scheme: light) {
        body { background: white; }
      }
    `;

    simulateMediaCondition(document, "prefers-color-scheme:dark", state);

    const rule = document.styleSheets[0].cssRules[0] as CSSMediaRule;
    expect(rule.media.mediaText).toBe("not all");
  });

  test("handles multiple rules with same feature", () => {
    styleElement.textContent = `
      @media (prefers-color-scheme: dark) {
        body { background: black; }
      }
      @media (prefers-color-scheme: light) {
        body { background: white; }
      }
    `;

    simulateMediaCondition(document, "prefers-color-scheme:dark", state);

    const darkRule = document.styleSheets[0].cssRules[0] as CSSMediaRule;
    const lightRule = document.styleSheets[0].cssRules[1] as CSSMediaRule;

    expect(darkRule.media.mediaText).toBe("all");
    expect(lightRule.media.mediaText).toBe("not all");
  });

  test("restores rules when condition is undefined", () => {
    styleElement.textContent = `
      @media (prefers-color-scheme: dark) {
        body { background: black; }
      }
    `;

    const originalMediaText = (
      document.styleSheets[0].cssRules[0] as CSSMediaRule
    ).media.mediaText;

    // Apply simulation
    simulateMediaCondition(document, "prefers-color-scheme:dark", state);

    // Restore
    simulateMediaCondition(document, undefined, state);

    const rule = document.styleSheets[0].cssRules[0] as CSSMediaRule;
    expect(rule.media.mediaText).toBe(originalMediaText);
  });

  test("restores rules when switching conditions", () => {
    styleElement.textContent = `
      @media (prefers-color-scheme: dark) {
        body { background: black; }
      }
      @media (prefers-color-scheme: light) {
        body { background: white; }
      }
    `;

    // Simulate dark
    simulateMediaCondition(document, "prefers-color-scheme:dark", state);
    expect(
      (document.styleSheets[0].cssRules[0] as CSSMediaRule).media.mediaText
    ).toBe("all");

    // Switch to light
    simulateMediaCondition(document, "prefers-color-scheme:light", state);
    expect(
      (document.styleSheets[0].cssRules[0] as CSSMediaRule).media.mediaText
    ).toBe("not all");
    expect(
      (document.styleSheets[0].cssRules[1] as CSSMediaRule).media.mediaText
    ).toBe("all");
  });

  test("does not modify rules without the target feature", () => {
    styleElement.textContent = `
      @media (min-width: 768px) {
        body { padding: 20px; }
      }
      @media (prefers-color-scheme: dark) {
        body { background: black; }
      }
    `;

    const widthRule = document.styleSheets[0].cssRules[0] as CSSMediaRule;
    const originalWidthMediaText = widthRule.media.mediaText;

    simulateMediaCondition(document, "prefers-color-scheme:dark", state);

    expect(widthRule.media.mediaText).toBe(originalWidthMediaText);
  });

  test("handles orientation condition", () => {
    styleElement.textContent = `
      @media (orientation: portrait) {
        body { padding: 10px; }
      }
      @media (orientation: landscape) {
        body { padding: 20px; }
      }
    `;

    // Get rule references before modification
    const rules = Array.from(
      document.styleSheets[0].cssRules
    ) as CSSMediaRule[];
    const portraitRule = rules.find((r) =>
      r.media.mediaText.includes("portrait")
    );
    const landscapeRule = rules.find((r) =>
      r.media.mediaText.includes("landscape")
    );

    expect(portraitRule).toBeDefined();
    expect(landscapeRule).toBeDefined();
    if (!portraitRule || !landscapeRule) {
      throw new Error("Test setup failed");
    }

    simulateMediaCondition(document, "orientation:portrait", state);

    expect(portraitRule.media.mediaText).toBe("all");
    expect(landscapeRule.media.mediaText).toBe("not all");
  });

  test("handles hover condition", () => {
    styleElement.textContent = `
      @media (hover: hover) {
        button { cursor: pointer; }
      }
      @media (hover: none) {
        button { padding: 20px; }
      }
    `;

    // Get rule references before modification
    const rules = Array.from(
      document.styleSheets[0].cssRules
    ) as CSSMediaRule[];

    const hoverHoverOriginal = rules.find((r) =>
      r.media.mediaText.includes("hover: hover")
    );
    const hoverNoneOriginal = rules.find((r) =>
      r.media.mediaText.includes("hover: none")
    );

    expect(hoverHoverOriginal).toBeDefined();
    expect(hoverNoneOriginal).toBeDefined();
    if (!hoverHoverOriginal || !hoverNoneOriginal) {
      throw new Error("Test setup failed");
    }

    simulateMediaCondition(document, "hover:none", state);

    expect(hoverHoverOriginal.media.mediaText).toBe("not all");
    expect(hoverNoneOriginal.media.mediaText).toBe("all");
  });

  test("handles prefers-reduced-motion condition", () => {
    styleElement.textContent = `
      @media (prefers-reduced-motion: reduce) {
        * { animation: none !important; }
      }
    `;

    simulateMediaCondition(document, "prefers-reduced-motion:reduce", state);

    const rule = document.styleSheets[0].cssRules[0] as CSSMediaRule;
    expect(rule.media.mediaText).toBe("all");
  });

  test("handles complex media queries with multiple conditions", () => {
    styleElement.textContent = `
      @media screen and (prefers-color-scheme: dark) and (min-width: 768px) {
        body { background: black; }
      }
    `;

    simulateMediaCondition(document, "prefers-color-scheme:dark", state);

    const rule = document.styleSheets[0].cssRules[0] as CSSMediaRule;
    expect(rule.media.mediaText).toBe("all");
  });

  test("does not match negated queries", () => {
    styleElement.textContent = `
      @media not all and (prefers-color-scheme: dark) {
        body { background: white; }
      }
    `;

    simulateMediaCondition(document, "prefers-color-scheme:dark", state);

    const rule = document.styleSheets[0].cssRules[0] as CSSMediaRule;
    // Negated query should be set to "not all" since it doesn't positively match
    expect(rule.media.mediaText).toBe("not all");
  });

  test("returns state for reuse", () => {
    styleElement.textContent = `
      @media (prefers-color-scheme: dark) {
        body { background: black; }
      }
    `;

    const returnedState = simulateMediaCondition(
      document,
      "prefers-color-scheme:dark",
      state
    );

    expect(returnedState).toBe(state);
    expect(returnedState.modifiedRules.size).toBe(1);
  });

  test("creates new state if not provided", () => {
    styleElement.textContent = `
      @media (prefers-color-scheme: dark) {
        body { background: black; }
      }
    `;

    const returnedState = simulateMediaCondition(
      document,
      "prefers-color-scheme:dark"
    );

    expect(returnedState.modifiedRules.size).toBe(1);
  });

  test("handles invalid condition gracefully", () => {
    styleElement.textContent = `
      @media (prefers-color-scheme: dark) {
        body { background: black; }
      }
    `;

    const originalMediaText = (
      document.styleSheets[0].cssRules[0] as CSSMediaRule
    ).media.mediaText;

    simulateMediaCondition(document, "invalid", state);

    // Should not modify anything
    const rule = document.styleSheets[0].cssRules[0] as CSSMediaRule;
    expect(rule.media.mediaText).toBe(originalMediaText);
  });

  test("handles empty condition gracefully", () => {
    styleElement.textContent = `
      @media (prefers-color-scheme: dark) {
        body { background: black; }
      }
    `;

    const originalMediaText = (
      document.styleSheets[0].cssRules[0] as CSSMediaRule
    ).media.mediaText;

    simulateMediaCondition(document, "", state);

    const rule = document.styleSheets[0].cssRules[0] as CSSMediaRule;
    expect(rule.media.mediaText).toBe(originalMediaText);
  });
});

describe("parseMediaCondition", () => {
  test("parses simple condition without parentheses", () => {
    const result = parseMediaCondition("prefers-color-scheme:dark");
    expect(result).toEqual({ feature: "prefers-color-scheme", value: "dark" });
  });

  test("parses condition with parentheses", () => {
    const result = parseMediaCondition("(prefers-color-scheme: dark)");
    expect(result).toEqual({ feature: "prefers-color-scheme", value: "dark" });
  });

  test("parses width condition", () => {
    const result = parseMediaCondition("min-width:768px");
    expect(result).toEqual({ feature: "min-width", value: "768px" });
  });

  test("parses hover condition", () => {
    const result = parseMediaCondition("hover:none");
    expect(result).toEqual({ feature: "hover", value: "none" });
  });

  test("parses orientation condition", () => {
    const result = parseMediaCondition("orientation:portrait");
    expect(result).toEqual({ feature: "orientation", value: "portrait" });
  });

  test("normalizes feature and value to lowercase", () => {
    const result = parseMediaCondition("Prefers-Color-Scheme:DARK");
    expect(result).toEqual({ feature: "prefers-color-scheme", value: "dark" });
  });

  test("handles spaces around colon", () => {
    const result = parseMediaCondition("prefers-color-scheme : dark");
    expect(result).toEqual({ feature: "prefers-color-scheme", value: "dark" });
  });

  test("returns undefined for invalid condition", () => {
    expect(parseMediaCondition("invalid")).toBeUndefined();
    expect(parseMediaCondition("")).toBeUndefined();
    expect(parseMediaCondition(":::")).toBeUndefined();
  });
});

describe("mediaQueryMatchesValue", () => {
  test("matches simple media query", () => {
    expect(
      mediaQueryMatchesValue(
        "(prefers-color-scheme: dark)",
        "prefers-color-scheme",
        "dark"
      )
    ).toBe(true);
  });

  test("does not match different value", () => {
    expect(
      mediaQueryMatchesValue(
        "(prefers-color-scheme: light)",
        "prefers-color-scheme",
        "dark"
      )
    ).toBe(false);
  });

  test("does not match different feature", () => {
    expect(
      mediaQueryMatchesValue(
        "(prefers-reduced-motion: reduce)",
        "prefers-color-scheme",
        "dark"
      )
    ).toBe(false);
  });

  test("matches hover feature", () => {
    expect(mediaQueryMatchesValue("(hover: hover)", "hover", "hover")).toBe(
      true
    );
    expect(mediaQueryMatchesValue("(hover: none)", "hover", "none")).toBe(true);
    expect(mediaQueryMatchesValue("(hover: hover)", "hover", "none")).toBe(
      false
    );
  });

  test("does not match negated queries", () => {
    expect(
      mediaQueryMatchesValue(
        "not (prefers-color-scheme: dark)",
        "prefers-color-scheme",
        "dark"
      )
    ).toBe(false);
  });

  test("does not match queries with not modifier", () => {
    expect(
      mediaQueryMatchesValue(
        "not all and (prefers-color-scheme: dark)",
        "prefers-color-scheme",
        "dark"
      )
    ).toBe(false);
  });

  test("matches compound queries without negation", () => {
    expect(
      mediaQueryMatchesValue(
        "(min-width: 768px) and (prefers-color-scheme: dark)",
        "prefers-color-scheme",
        "dark"
      )
    ).toBe(true);
  });

  test("returns false for invalid media query", () => {
    expect(mediaQueryMatchesValue("invalid{}", "hover", "none")).toBe(false);
  });

  test("is case insensitive", () => {
    expect(
      mediaQueryMatchesValue(
        "(PREFERS-COLOR-SCHEME: DARK)",
        "prefers-color-scheme",
        "dark"
      )
    ).toBe(true);
  });
});
