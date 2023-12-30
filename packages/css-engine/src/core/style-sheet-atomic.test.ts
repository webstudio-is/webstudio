import { describe, beforeEach, test, expect } from "@jest/globals";
import type { StyleSheetAtomic } from "./style-sheet-atomic";
import { createAtomicStyleSheet } from "./create-style-sheet";

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
      style: { display: { type: "keyword", value: "block" } },
      breakpoint: "x",
    });
    expect(sheet.cssText).toMatchInlineSnapshot(`
"@media all {
  .c19k25ej {
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
  .c19k25ej {
    display: block
  }
  .cs9ip66 {
    color: red
  }
}"
`);
  });

  test("use state suffix", () => {
    sheet.addStyleRule(
      {
        style: { display: { type: "keyword", value: "block" } },
        breakpoint: "x",
      },
      ":hover"
    );
    expect(sheet.cssText).toMatchInlineSnapshot(`
"@media all {
  .cmyojan:hover {
    display: block
  }
}"
`);
  });

  test("added classes", () => {
    const { classes } = sheet.addStyleRule({
      style: { display: { type: "keyword", value: "block" } },
      breakpoint: "x",
    });
    expect(classes).toEqual(["c19k25ej"]);
  });

  test("rule with multiple properties", () => {
    sheet.addMediaRule(mediaId0, mediaRuleOptions0);
    sheet.addStyleRule({
      style: {
        display: { type: "keyword", value: "block" },
        color: { type: "keyword", value: "red" },
      },
      breakpoint: "0",
    });
    expect(sheet.cssText).toMatchInlineSnapshot(`
"@media all and (min-width: 0px) {
  .cusz56a {
    display: block
  }
  .cswg5vq {
    color: red
  }
}"
`);
  });

  test("add style rule to an existing media rule", () => {
    sheet.addMediaRule(mediaId0, mediaRuleOptions0);
    sheet.addStyleRule({
      style: {
        display: { type: "keyword", value: "block" },
        color: { type: "keyword", value: "red" },
      },
      breakpoint: "0",
    });
    expect(sheet.cssText).toMatchInlineSnapshot(`
"@media all and (min-width: 0px) {
  .cusz56a {
    display: block
  }
  .cswg5vq {
    color: red
  }
}"
`);
    sheet.addStyleRule({
      style: {
        // It should prevent duplicates
        display: { type: "keyword", value: "block" },
        color: { type: "keyword", value: "green" },
      },
      breakpoint: "0",
    });
    expect(sheet.cssText).toMatchInlineSnapshot(`
"@media all and (min-width: 0px) {
  .cusz56a {
    display: block
  }
  .cswg5vq {
    color: red
  }
  .c8jb4vi {
    color: green
  }
}"
`);
  });
});
