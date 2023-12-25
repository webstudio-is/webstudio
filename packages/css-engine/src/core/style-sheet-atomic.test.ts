import { describe, beforeEach, test, expect } from "@jest/globals";
import { StyleSheetAtomic } from "./style-sheet-atomic";
import { createAtomicStyleSheet } from ".";

const style0 = {
  display: { type: "keyword", value: "block" },
} as const;

const mediaRuleOptions0 = { minWidth: 0 } as const;
const mediaId0 = "0";

describe("Style Sheet Atomic", () => {
  let sheet: StyleSheetAtomic;

  const reset = () => {
    sheet = createAtomicStyleSheet();
  };

  beforeEach(reset);

  test("use default media rule when there is no matching one registered", () => {
    sheet.addStyleRule({
      style: style0,
      breakpoint: "x",
    });
    expect(sheet.cssText).toMatchInlineSnapshot(`
      "@media all {
        .c1y9jjw5 {
          display: block
        }
      }"
    `);
    sheet.addStyleRule({
      style: { color: { type: "keyword", value: "red" } },
      breakpoint: "x",
    });
    expect(sheet.cssText).toMatchInlineSnapshot(`
      "@media all {
        .c1y9jjw5 {
          display: block
        }
        .c1kh19hs {
          color: red
        }
      }"
    `);

    sheet.addMediaRule(mediaId0, mediaRuleOptions0);
    sheet.addStyleRule({
      style: { color: { type: "keyword", value: "blue" } },
      breakpoint: mediaId0,
    });
    // Default media query should allways be the first to have the lowest source order specificity
    expect(sheet.cssText).toMatchInlineSnapshot(`
      "@media all {
        .c1y9jjw5 {
          display: block
        }
        .c1kh19hs {
          color: red
        }
      }
      @media all and (min-width: 0px) {
        .c1c4iqej {
          color: blue
        }
      }"
    `);
  });

  test("rule with multiple properties", () => {
    sheet.addMediaRule(mediaId0, mediaRuleOptions0);
    sheet.addStyleRule({
      style: {
        ...style0,
        color: { type: "keyword", value: "red" },
      },
      breakpoint: "0",
    });
    expect(sheet.cssText).toMatchInlineSnapshot(`
      "@media all and (min-width: 0px) {
        .c1y9jjw5 {
          display: block
        }
        .c1kh19hs {
          color: red
        }
      }"
    `);
  });

  test("add rule", () => {
    sheet.addMediaRule(mediaId0, mediaRuleOptions0);
    sheet.addStyleRule({
      style: {
        ...style0,
        color: { type: "keyword", value: "red" },
      },
      breakpoint: "0",
    });
    expect(sheet.cssText).toMatchInlineSnapshot(`
      "@media all and (min-width: 0px) {
        .c1y9jjw5 {
          display: block
        }
        .c1kh19hs {
          color: red
        }
      }"
    `);
    sheet.addStyleRule({
      style: {
        // It should prevent duplicates
        ...style0,
        color: { type: "keyword", value: "green" },
      },
      breakpoint: "0",
    });
    expect(sheet.cssText).toMatchInlineSnapshot(`
      "@media all and (min-width: 0px) {
        .c1y9jjw5 {
          display: block
        }
        .c1kh19hs {
          color: red
        }
        .c7g7pdu {
          color: green
        }
      }"
    `);
  });
});
