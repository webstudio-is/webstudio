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
    const { classes } = sheet.addStyleRule(
      {
        style: style0,
        breakpoint: "x",
      },
      ":hover"
    );
    expect(sheet.cssText).toMatchInlineSnapshot(`
"@media all {
  .c1pw5kj8:hover {
    display: block
  }
}"
`);
    expect(classes).toEqual(["c1pw5kj8"]);
    sheet.addStyleRule({
      style: { color: { type: "keyword", value: "red" } },
      breakpoint: "x",
    });
    expect(sheet.cssText).toMatchInlineSnapshot(`
"@media all {
  .c1pw5kj8:hover {
    display: block
  }
  .c1r6dys4 {
    color: red
  }
}"
`);
    expect(classes).toEqual(["c1pw5kj8"]);
    sheet.addMediaRule(mediaId0, mediaRuleOptions0);
    sheet.addStyleRule({
      style: { color: { type: "keyword", value: "blue" } },
      breakpoint: mediaId0,
    });
    // Default media query should allways be the first to have the lowest source order specificity
    expect(sheet.cssText).toMatchInlineSnapshot(`
"@media all {
  .c1pw5kj8:hover {
    display: block
  }
  .c1r6dys4 {
    color: red
  }
}
@media all and (min-width: 0px) {
  .c1abs1wg {
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
  .cj26d0t {
    display: block
  }
  .c1g8spfr {
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
  .cj26d0t {
    display: block
  }
  .c1g8spfr {
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
  .cj26d0t {
    display: block
  }
  .c1g8spfr {
    color: red
  }
  .crf0z62 {
    color: green
  }
}"
`);
  });
});
