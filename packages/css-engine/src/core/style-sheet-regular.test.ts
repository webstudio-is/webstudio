import { describe, beforeEach, test, expect } from "@jest/globals";
import type { StyleSheetRegular } from "./style-sheet-regular";
import { createRegularStyleSheet } from "./create-style-sheet";
import type { TransformValue } from "./to-value";

const style0 = {
  display: { type: "keyword", value: "block" },
} as const;

const mediaRuleOptions0 = { minWidth: 0 } as const;
const mediaId0 = "0";

const style1 = {
  display: { type: "keyword", value: "flex" },
} as const;

const style2 = {
  display: { type: "keyword", value: "block" },
  color: { type: "keyword", value: "black" },
} as const;

const mediaRuleOptions1 = { minWidth: 300 } as const;
const mediaId1 = "1";

describe("nesting rule", () => {
  const transformValue: TransformValue = (styleValue) => {
    if (styleValue.type === "keyword") {
      return {
        type: "keyword",
        value: styleValue.value.toUpperCase(),
      };
    }
  };

  test("generate rules for breakpoint", () => {
    const sheet = createRegularStyleSheet();
    const rule = sheet.addNestingRule(".instance");
    rule.setDeclaration({
      breakpoint: "base",
      selector: "",
      property: "width",
      value: { type: "keyword", value: "auto" },
    });
    rule.setDeclaration({
      breakpoint: "base",
      selector: "",
      property: "height",
      value: { type: "keyword", value: "auto" },
    });
    rule.setDeclaration({
      breakpoint: "small",
      selector: "",
      property: "color",
      value: { type: "keyword", value: "transparent" },
    });
    expect(rule.toString({ breakpoint: "base" })).toMatchInlineSnapshot(`
".instance {
  width: auto;
  height: auto
}"
`);
    expect(rule.toString({ breakpoint: "small" })).toMatchInlineSnapshot(`
".instance {
  color: transparent
}"
`);
  });

  test("generated nested rules", () => {
    const sheet = createRegularStyleSheet();
    const rule = sheet.addNestingRule(".instance");
    rule.setDeclaration({
      breakpoint: "base",
      selector: "",
      property: "width",
      value: { type: "keyword", value: "auto" },
    });
    rule.setDeclaration({
      breakpoint: "base",
      selector: "",
      property: "height",
      value: { type: "keyword", value: "auto" },
    });
    rule.setDeclaration({
      breakpoint: "base",
      selector: ":hover",
      property: "color",
      value: { type: "keyword", value: "transparent" },
    });
    expect(rule.toString({ breakpoint: "base" })).toMatchInlineSnapshot(`
".instance {
  width: auto;
  height: auto
}
.instance:hover {
  color: transparent
}"
`);
  });

  test("sort nested rules without state first", () => {
    const sheet = createRegularStyleSheet();
    const rule = sheet.addNestingRule(".instance");
    rule.setDeclaration({
      breakpoint: "base",
      selector: ":hover",
      property: "color",
      value: { type: "keyword", value: "transparent" },
    });
    rule.setDeclaration({
      breakpoint: "base",
      selector: "",
      property: "width",
      value: { type: "keyword", value: "auto" },
    });
    expect(rule.toString({ breakpoint: "base" })).toMatchInlineSnapshot(`
".instance {
  width: auto
}
.instance:hover {
  color: transparent
}"
`);
  });

  test("customize indentation", () => {
    const sheet = createRegularStyleSheet();
    const rule = sheet.addNestingRule(".instance");
    rule.setDeclaration({
      breakpoint: "base",
      selector: "",
      property: "width",
      value: { type: "keyword", value: "auto" },
    });
    expect(rule.toString({ breakpoint: "base", indent: 4 }))
      .toMatchInlineSnapshot(`
"    .instance {
      width: auto
    }"
`);
  });

  test("customize value transformer", () => {
    const sheet = createRegularStyleSheet();
    const rule = sheet.addNestingRule(".instance");
    rule.setDeclaration({
      breakpoint: "base",
      selector: "",
      property: "width",
      value: { type: "keyword", value: "auto" },
    });
    expect(rule.toString({ breakpoint: "base", transformValue }))
      .toMatchInlineSnapshot(`
".instance {
  width: AUTO
}"
`);
  });

  test("invalidate cache", () => {
    const sheet = createRegularStyleSheet();
    const rule = sheet.addNestingRule(".instance");
    rule.setDeclaration({
      breakpoint: "base",
      selector: "",
      property: "width",
      value: { type: "keyword", value: "auto" },
    });
    expect(rule.toString({ breakpoint: "base" })).toMatchInlineSnapshot(`
".instance {
  width: auto
}"
`);
    // invalidate by set declaration
    rule.setDeclaration({
      breakpoint: "base",
      selector: "",
      property: "height",
      value: { type: "keyword", value: "auto" },
    });
    expect(rule.toString({ breakpoint: "base" })).toMatchInlineSnapshot(`
".instance {
  width: auto;
  height: auto
}"
`);
    // invalidate by delete declaration
    rule.deleteDeclaration({
      breakpoint: "base",
      selector: "",
      property: "height",
    });
    expect(rule.toString({ breakpoint: "base" })).toMatchInlineSnapshot(`
".instance {
  width: auto
}"
`);
    // invalidate by indent
    expect(rule.toString({ breakpoint: "base", indent: 2 }))
      .toMatchInlineSnapshot(`
"  .instance {
    width: auto
  }"
`);
    // invalidate by transform value
    expect(rule.toString({ breakpoint: "base", indent: 2, transformValue }))
      .toMatchInlineSnapshot(`
"  .instance {
    width: AUTO
  }"
`);
  });

  test("generate breakpoint without declarations", () => {
    const sheet = createRegularStyleSheet();
    const rule = sheet.addNestingRule(".instance");
    expect(rule.toString({ breakpoint: "base" })).toEqual("");
  });
});

describe("mixin rule", () => {
  test("compose rules from multiple mixins", () => {
    const sheet = createRegularStyleSheet();
    const rule = sheet.addNestingRule(".instance");
    const localMixin = sheet.addMixinRule("local");
    const tokenMixin = sheet.addMixinRule("token");
    rule.applyMixins(["token", "local"]);
    localMixin.setDeclaration({
      breakpoint: "base",
      selector: "",
      property: "width",
      value: { type: "keyword", value: "fit-content" },
    });
    tokenMixin.setDeclaration({
      breakpoint: "base",
      selector: "",
      property: "width",
      value: { type: "keyword", value: "auto" },
    });
    tokenMixin.setDeclaration({
      breakpoint: "base",
      selector: "",
      property: "height",
      value: { type: "keyword", value: "auto" },
    });
    expect(rule.toString({ breakpoint: "base" })).toMatchInlineSnapshot(`
".instance {
  width: fit-content;
  height: auto
}"
`);
  });

  test("generate nested selector", () => {
    const sheet = createRegularStyleSheet();
    const rule = sheet.addNestingRule(".instance");
    const localMixin = sheet.addMixinRule("local");
    const tokenMixin = sheet.addMixinRule("token");
    rule.applyMixins(["token", "local"]);
    localMixin.setDeclaration({
      breakpoint: "base",
      selector: ":hover",
      property: "width",
      value: { type: "keyword", value: "fit-content" },
    });
    tokenMixin.setDeclaration({
      breakpoint: "base",
      selector: ":hover",
      property: "height",
      value: { type: "keyword", value: "auto" },
    });
    expect(rule.toString({ breakpoint: "base" })).toMatchInlineSnapshot(`
".instance:hover {
  height: auto;
  width: fit-content
}"
`);
  });

  test("invalidate cache after applying mixins", () => {
    const sheet = createRegularStyleSheet();
    const rule = sheet.addNestingRule(".instance");
    const localMixin = sheet.addMixinRule("local");
    localMixin.setDeclaration({
      breakpoint: "base",
      selector: "",
      property: "width",
      value: { type: "keyword", value: "auto" },
    });
    expect(rule.toString({ breakpoint: "base" })).toMatchInlineSnapshot(`""`);
    rule.applyMixins(["local"]);
    expect(rule.toString({ breakpoint: "base" })).toMatchInlineSnapshot(`
".instance {
  width: auto
}"
`);
  });

  test("invalidate cache after updating mixin declaration", () => {
    const sheet = createRegularStyleSheet();
    const rule = sheet.addNestingRule(".instance");
    const localMixin = sheet.addMixinRule("local");
    rule.applyMixins(["local"]);
    expect(rule.toString({ breakpoint: "base" })).toMatchInlineSnapshot(`""`);
    localMixin.setDeclaration({
      breakpoint: "base",
      selector: "",
      property: "width",
      value: { type: "keyword", value: "auto" },
    });
    expect(rule.toString({ breakpoint: "base" })).toMatchInlineSnapshot(`
".instance {
  width: auto
}"
`);
  });
});

describe("Style Sheet Regular", () => {
  let sheet: StyleSheetRegular;

  const reset = () => {
    sheet = createRegularStyleSheet();
  };

  beforeEach(reset);

  test("minWidth media rule", () => {
    sheet.addMediaRule("0", { minWidth: 0 });
    sheet.addStyleRule(
      {
        style: { color: { type: "keyword", value: "red" } },
        breakpoint: "0",
      },
      ".c1"
    );
    expect(sheet.cssText).toMatchInlineSnapshot(`
      "@media all and (min-width: 0px) {
        .c1 {
          color: red
        }
      }"
    `);
  });

  test("maxWidth media rule", () => {
    sheet.addMediaRule("0", { maxWidth: 1000 });
    sheet.addStyleRule(
      {
        style: { color: { type: "keyword", value: "red" } },
        breakpoint: "0",
      },
      ".c1"
    );
    expect(sheet.cssText).toMatchInlineSnapshot(`
      "@media all and (max-width: 1000px) {
        .c1 {
          color: red
        }
      }"
    `);
  });

  test("maxWidth and maxWith media rule", () => {
    sheet.addMediaRule("0", { maxWidth: 1000, minWidth: 360 });
    sheet.addStyleRule(
      {
        style: { color: { type: "keyword", value: "red" } },
        breakpoint: "0",
      },
      ".c1"
    );
    expect(sheet.cssText).toMatchInlineSnapshot(`
      "@media all and (min-width: 360px) and (max-width: 1000px) {
        .c1 {
          color: red
        }
      }"
    `);
  });

  test("use default media rule when there is no matching one registered", () => {
    sheet.addStyleRule(
      {
        style: style0,
        breakpoint: "x",
      },
      ".c"
    );
    expect(sheet.cssText).toMatchInlineSnapshot(`
      "@media all {
        .c {
          display: block
        }
      }"
    `);
    sheet.addStyleRule(
      {
        style: { color: { type: "keyword", value: "red" } },
        breakpoint: "x",
      },
      ".c1"
    );
    expect(sheet.cssText).toMatchInlineSnapshot(`
      "@media all {
        .c {
          display: block
        }
        .c1 {
          color: red
        }
      }"
    `);

    sheet.addMediaRule(mediaId0, mediaRuleOptions0);
    sheet.addStyleRule(
      {
        style: { color: { type: "keyword", value: "blue" } },
        breakpoint: mediaId0,
      },
      ".c1"
    );
    // Default media query should allways be the first to have the lowest source order specificity
    expect(sheet.cssText).toMatchInlineSnapshot(`
      "@media all {
        .c {
          display: block
        }
        .c1 {
          color: red
        }
      }
      @media all and (min-width: 0px) {
        .c1 {
          color: blue
        }
      }"
    `);
  });

  test("sort media queries based on lower min-width", () => {
    sheet.addMediaRule(mediaId1, mediaRuleOptions1);
    sheet.addStyleRule(
      {
        style: style1,
        breakpoint: mediaId1,
      },
      ".c2"
    );

    sheet.addMediaRule(mediaId0, mediaRuleOptions0);
    sheet.addStyleRule(
      {
        style: style0,
        breakpoint: mediaId0,
      },
      ".c1"
    );

    sheet.addStyleRule(
      {
        style: style0,
        breakpoint: "x",
      },
      ".c3"
    );

    // Default media query should allways be the first to have the lowest source order specificity
    expect(sheet.cssText).toMatchInlineSnapshot(`
      "@media all {
        .c3 {
          display: block
        }
      }
      @media all and (min-width: 0px) {
        .c1 {
          display: block
        }
      }
      @media all and (min-width: 300px) {
        .c2 {
          display: flex
        }
      }"
    `);
  });

  test("keep the sort order when minWidth is not defined", () => {
    sheet.addStyleRule(
      {
        style: style0,
        breakpoint: "x",
      },
      ".c0"
    );
    sheet.addStyleRule(
      {
        style: style1,
        breakpoint: "x",
      },
      ".c1"
    );
    expect(sheet.cssText).toMatchInlineSnapshot(`
      "@media all {
        .c0 {
          display: block
        }
        .c1 {
          display: flex
        }
      }"
    `);

    reset();

    sheet.addStyleRule(
      {
        style: style1,
        breakpoint: "x",
      },
      ".c1"
    );
    sheet.addStyleRule(
      {
        style: style0,
        breakpoint: "x",
      },
      ".c0"
    );
    expect(sheet.cssText).toMatchInlineSnapshot(`
      "@media all {
        .c1 {
          display: flex
        }
        .c0 {
          display: block
        }
      }"
    `);
  });

  test("rule with multiple properties", () => {
    sheet.addMediaRule(mediaId0, mediaRuleOptions0);
    sheet.addStyleRule(
      {
        style: {
          ...style0,
          color: { type: "keyword", value: "red" },
        },
        breakpoint: "0",
      },
      ".c"
    );
    expect(sheet.cssText).toMatchInlineSnapshot(`
      "@media all and (min-width: 0px) {
        .c {
          display: block;
          color: red
        }
      }"
    `);
  });

  test("hyphenate property", () => {
    sheet.addMediaRule(mediaId0, mediaRuleOptions0);
    sheet.addStyleRule(
      {
        style: {
          backgroundColor: { type: "keyword", value: "red" },
        },
        breakpoint: "0",
      },
      ".c"
    );
    expect(sheet.cssText).toMatchInlineSnapshot(`
      "@media all and (min-width: 0px) {
        .c {
          background-color: red
        }
      }"
    `);
  });

  test("add rule", () => {
    sheet.addMediaRule(mediaId0, mediaRuleOptions0);
    const rule1 = sheet.addStyleRule(
      {
        style: {
          ...style0,
          color: { type: "keyword", value: "red" },
        },
        breakpoint: "0",
      },
      ".c"
    );
    expect(sheet.cssText).toMatchInlineSnapshot(`
      "@media all and (min-width: 0px) {
        .c {
          display: block;
          color: red
        }
      }"
    `);
    expect(rule1.cssText).toMatchInlineSnapshot(`
      ".c {
        display: block;
        color: red
      }"
    `);
    sheet.addStyleRule(
      {
        style: {
          ...style0,
          color: { type: "keyword", value: "green" },
        },
        breakpoint: "0",
      },
      ".c2"
    );
    expect(sheet.cssText).toMatchInlineSnapshot(`
      "@media all and (min-width: 0px) {
        .c {
          display: block;
          color: red
        }
        .c2 {
          display: block;
          color: green
        }
      }"
    `);
  });

  test("update rule", () => {
    sheet.addMediaRule(mediaId0, mediaRuleOptions0);
    const rule = sheet.addStyleRule(
      {
        style: {
          ...style0,
          color: { type: "keyword", value: "red" },
        },
        breakpoint: "0",
      },
      ".c"
    );
    expect(sheet.cssText).toMatchInlineSnapshot(`
      "@media all and (min-width: 0px) {
        .c {
          display: block;
          color: red
        }
      }"
    `);
    expect(rule.cssText).toMatchInlineSnapshot(`
      ".c {
        display: block;
        color: red
      }"
    `);

    rule.styleMap.set("color", { type: "keyword", value: "green" });

    expect(rule.cssText).toMatchInlineSnapshot(`
      ".c {
        display: block;
        color: green
      }"
    `);

    expect(sheet.cssText).toMatchInlineSnapshot(`
      "@media all and (min-width: 0px) {
        .c {
          display: block;
          color: green
        }
      }"
    `);
  });

  test("update media rule options", () => {
    sheet.addMediaRule(mediaId0, mediaRuleOptions0);
    sheet.addStyleRule(
      {
        style: {
          color: { type: "keyword", value: "red" },
        },
        breakpoint: "0",
      },
      ".c"
    );
    expect(sheet.cssText).toMatchInlineSnapshot(`
      "@media all and (min-width: 0px) {
        .c {
          color: red
        }
      }"
    `);
    sheet.addMediaRule(mediaId0, { minWidth: 10 });
    expect(sheet.cssText).toMatchInlineSnapshot(`
      "@media all and (min-width: 10px) {
        .c {
          color: red
        }
      }"
    `);
  });

  test("don't override media queries", () => {
    sheet.addMediaRule(mediaId0, mediaRuleOptions0);
    sheet.addStyleRule(
      {
        style: style0,
        breakpoint: "0",
      },
      ".c"
    );
    expect(sheet.cssText).toMatchInlineSnapshot(`
      "@media all and (min-width: 0px) {
        .c {
          display: block
        }
      }"
    `);
    sheet.addMediaRule(mediaId0, mediaRuleOptions0);
    expect(sheet.cssText).toMatchInlineSnapshot(`
      "@media all and (min-width: 0px) {
        .c {
          display: block
        }
      }"
    `);
  });

  test("plaintext rule", () => {
    sheet.addPlaintextRule(".c { color: red }");
    expect(sheet.cssText).toMatchInlineSnapshot(`".c { color: red }"`);
  });

  test("plaintext - no duplicates", () => {
    sheet.addPlaintextRule(".c { color: red }");
    sheet.addPlaintextRule(".c { color: red }");
    sheet.addPlaintextRule(".c { color: green }");
    expect(sheet.cssText).toMatchInlineSnapshot(`
      ".c { color: red }
      .c { color: green }"
    `);
  });

  test("font family rule with space in the name", () => {
    sheet.addFontFaceRule({
      fontFamily: "Some Font",
      fontStyle: "normal",
      fontWeight: 400,
      fontDisplay: "swap",
      src: "url(/src)",
    });
    expect(sheet.cssText).toMatchInlineSnapshot(`
"@font-face {
  font-family: "Some Font"; font-style: normal; font-weight: 400; font-display: swap; src: url(/src);
}"
`);
  });

  test("clear", () => {
    sheet.addStyleRule(
      {
        style: style0,
        breakpoint: "0",
      },
      ".c"
    );
    sheet.clear();
    expect(sheet.cssText).toMatchInlineSnapshot(`""`);
  });

  test("get all rule style keys", () => {
    const rule = sheet.addStyleRule(
      {
        style: style2,
        breakpoint: "0",
      },
      ".c"
    );
    expect(Array.from(rule.styleMap.keys())).toMatchInlineSnapshot(`
      [
        "display",
        "color",
      ]
    `);
  });

  test("delete style from rule", () => {
    const rule = sheet.addStyleRule(
      {
        style: style2,
        breakpoint: "0",
      },
      ".c"
    );
    rule.styleMap.delete("display");
    expect(sheet.cssText).toMatchInlineSnapshot(`
      "@media all {
        .c {
          color: black
        }
      }"
    `);
  });

  test("render images with injected asset url", () => {
    const assets = new Map<string, { path: string }>([
      ["1234", { path: "foo.png" }],
    ]);
    sheet.setTransformer((styleValue) => {
      if (styleValue.type === "image" && styleValue.value.type === "asset") {
        const asset = assets.get(styleValue.value.value);
        if (asset === undefined) {
          return { type: "keyword", value: "none" };
        }
        return {
          type: "image",
          value: {
            type: "url",
            url: asset.path,
          },
        };
      }
    });
    const rule = sheet.addStyleRule(
      {
        style: {
          backgroundImage: {
            type: "image",
            value: {
              type: "asset",
              value: "1234",
            },
          },
        },
        breakpoint: "0",
      },
      ".c"
    );
    rule.styleMap.delete("display");
    expect(sheet.cssText).toMatchInlineSnapshot(`
      "@media all {
        .c {
          background-image: url("foo.png")
        }
      }"
    `);
  });

  test("render nesting rules", () => {
    const sheet = createRegularStyleSheet();
    sheet.addMediaRule("base", {});
    sheet.addMediaRule("small", { minWidth: 768 });
    const rule = sheet.addNestingRule(".instance");
    rule.setDeclaration({
      breakpoint: "small",
      selector: "",
      property: "color",
      value: { type: "keyword", value: "blue" },
    });
    rule.setDeclaration({
      breakpoint: "base",
      selector: "",
      property: "color",
      value: { type: "keyword", value: "red" },
    });
    expect(sheet.cssText).toMatchInlineSnapshot(`
"@media all {
  .instance {
    color: red
  }
}
@media all and (min-width: 768px) {
  .instance {
    color: blue
  }
}"
`);
  });

  test("render mixin rules", () => {
    const sheet = createRegularStyleSheet();
    sheet.addMediaRule("base", {});
    sheet.addMediaRule("small", { minWidth: 768 });
    const mixin = sheet.addMixinRule("local");
    mixin.setDeclaration({
      breakpoint: "small",
      selector: "",
      property: "color",
      value: { type: "keyword", value: "blue" },
    });
    mixin.setDeclaration({
      breakpoint: "base",
      selector: "",
      property: "color",
      value: { type: "keyword", value: "red" },
    });
    const rule = sheet.addNestingRule(".instance");
    rule.applyMixins(["local"]);
    expect(sheet.cssText).toMatchInlineSnapshot(`
"@media all {
  .instance {
    color: red
  }
}
@media all and (min-width: 768px) {
  .instance {
    color: blue
  }
}"
`);
  });

  test("avoid rendering empty media queries", () => {
    const sheet = createRegularStyleSheet();
    sheet.addMediaRule("base", {});
    sheet.addMediaRule("small", { minWidth: 768 });
    const rule = sheet.addNestingRule(".instance");
    rule.setDeclaration({
      breakpoint: "base",
      selector: "",
      property: "color",
      value: { type: "keyword", value: "blue" },
    });
    expect(sheet.cssText).toMatchInlineSnapshot(`
"@media all {
  .instance {
    color: blue
  }
}"
`);
  });

  test("support descendent suffix", () => {
    const sheet = createRegularStyleSheet();
    sheet.addMediaRule("base", {});
    const rule1 = sheet.addNestingRule(".instance");
    rule1.setDeclaration({
      breakpoint: "base",
      selector: ":hover",
      property: "width",
      value: { type: "keyword", value: "auto" },
    });
    const rule2 = sheet.addNestingRule(".instance", " img");
    rule2.setDeclaration({
      breakpoint: "base",
      selector: ":hover",
      property: "width",
      value: { type: "keyword", value: "auto" },
    });
    expect(sheet.cssText).toMatchInlineSnapshot(`
"@media all {
  .instance:hover {
    width: auto
  }
  .instance img:hover {
    width: auto
  }
}"
`);
  });
});
