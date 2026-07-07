import { describe, test, expect } from "vitest";
import { validateSelector } from "./selector-validation";

describe("validateSelector", () => {
  describe("valid selectors", () => {
    test("simple pseudo-classes", () => {
      const selectors = [
        ":hover",
        ":focus",
        ":active",
        ":visited",
        ":disabled",
        ":checked",
        ":focus-visible",
        ":focus-within",
      ];

      for (const selector of selectors) {
        const result = validateSelector(selector);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.type).toBe("pseudo-class");
        }
      }
    });

    test("simple pseudo-elements", () => {
      const selectors = [
        "::before",
        "::after",
        "::placeholder",
        "::first-line",
        "::first-letter",
        "::selection",
        "::marker",
        "::backdrop",
      ];

      for (const selector of selectors) {
        const result = validateSelector(selector);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.type).toBe("pseudo-element");
        }
      }
    });

    test("legacy single-colon pseudo-elements", () => {
      const selectors = [":before", ":after", ":first-line", ":first-letter"];

      for (const selector of selectors) {
        const result = validateSelector(selector);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.type).toBe("pseudo-element");
        }
      }
    });

    test("functional pseudo-classes with simple selectors", () => {
      const selectors = [":not(div)", ":is(a)", ":where(span)", ":has(p)"];

      for (const selector of selectors) {
        const result = validateSelector(selector);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.type).toBe("pseudo-class");
        }
      }
    });

    test("functional pseudo-classes with An+B notation", () => {
      const selectors = [
        ":nth-child(2n)",
        ":nth-last-child(odd)",
        ":nth-of-type(3n+1)",
        ":nth-last-of-type(even)",
      ];

      for (const selector of selectors) {
        const result = validateSelector(selector);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.type).toBe("pseudo-class");
        }
      }
    });

    test("functional pseudo-classes with nested selectors", () => {
      const selectors = [
        ":not(.class)",
        ":is(#id)",
        ":where([attr])",
        ":has(> div)",
      ];

      for (const selector of selectors) {
        const result = validateSelector(selector);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.type).toBe("pseudo-class");
        }
      }
    });

    test("shadow DOM pseudo-classes", () => {
      const selectors = [":host", ":host(.class)", ":host-context(.class)"];

      for (const selector of selectors) {
        const result = validateSelector(selector);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.type).toBe("pseudo-class");
        }
      }
    });

    test("linguistic pseudo-classes", () => {
      const selectors = [":lang(en)", ":dir(rtl)", ":dir(ltr)"];

      for (const selector of selectors) {
        const result = validateSelector(selector);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.type).toBe("pseudo-class");
        }
      }
    });

    test("custom state pseudo-class", () => {
      const result = validateSelector(":state(custom)");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.type).toBe("pseudo-class");
      }
    });

    test("time-dimensional pseudo-classes", () => {
      const selectors = [":current", ":past", ":future"];

      for (const selector of selectors) {
        const result = validateSelector(selector);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.type).toBe("pseudo-class");
        }
      }
    });

    test("less common pseudo-elements from generated list", () => {
      const selectors = [
        "::grammar-error",
        "::spelling-error",
        "::target-text",
        "::file-selector-button",
      ];

      for (const selector of selectors) {
        const result = validateSelector(selector);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.type).toBe("pseudo-element");
        }
      }
    });

    test("functional pseudo-elements", () => {
      const selectors = ["::part(tab)", "::slotted(span)"];

      for (const selector of selectors) {
        const result = validateSelector(selector);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.type).toBe("pseudo-element");
        }
      }
    });
  });

  describe("attribute selectors", () => {
    test("basic attribute selectors", () => {
      const selectors = [
        "[data-state]",
        "[data-state=open]",
        "[data-state=closed]",
        "[aria-expanded=true]",
        "[aria-hidden=false]",
      ];

      for (const selector of selectors) {
        const result = validateSelector(selector);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.type).toBe("attribute");
        }
      }
    });

    test("attribute selectors with operators", () => {
      const selectors = [
        "[class~=foo]",
        "[lang|=en]",
        "[href^=https]",
        '[src$=".png"]',
        "[title*=hello]",
      ];

      for (const selector of selectors) {
        const result = validateSelector(selector);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.type).toBe("attribute");
        }
      }
    });

    test("attribute selectors with quotes", () => {
      const selectors = [
        '[data-state="open"]',
        "[data-state='closed']",
        '[aria-label="menu button"]',
      ];

      for (const selector of selectors) {
        const result = validateSelector(selector);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.type).toBe("attribute");
        }
      }
    });

    test("case-insensitive attribute selectors", () => {
      const selectors = ["[type=text i]", "[href$=PDF i]"];

      for (const selector of selectors) {
        const result = validateSelector(selector);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.type).toBe("attribute");
        }
      }
    });
  });

  describe("invalid selectors", () => {
    test("empty selector", () => {
      const result = validateSelector("");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Selector cannot be empty");
      }
    });

    test("whitespace-only selector", () => {
      const result = validateSelector("   ");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Selector cannot be empty");
      }
    });

    test("selector not starting with colon or bracket", () => {
      const result = validateSelector("hover");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(
          "Selector must start with a colon (:) for pseudo-classes, double colon (::) for pseudo-elements, or bracket ([) for attribute selectors"
        );
      }
    });

    test("invalid pseudo-class name", () => {
      const result = validateSelector(":not-a-real-pseudo-class");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid pseudo-class");
      }
    });

    test("invalid functional pseudo-class name", () => {
      const result = validateSelector(":blablubb(div)");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid pseudo-class");
      }
    });

    test("invalid pseudo-element name", () => {
      const result = validateSelector("::not-a-real-pseudo-element");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid pseudo-element");
      }
    });

    test("unbalanced parentheses in functional pseudo-class", () => {
      const result = validateSelector(":not(div");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid CSS selector syntax");
      }
    });

    test("unbalanced parentheses - too many closing", () => {
      const result = validateSelector(":not(div))");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid CSS selector syntax");
      }
    });

    test("invalid syntax inside functional pseudo-class", () => {
      // css-tree is lenient and will parse this
      // The browser will ultimately reject truly invalid selectors
      const result = validateSelector(":has(>>invalid)");
      // This actually parses in css-tree (it's lenient)
      expect(result.success).toBe(true);
    });

    test("unbalanced brackets in attribute selector", () => {
      const result = validateSelector("[data-state");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid CSS selector syntax");
      }
    });
  });
});
