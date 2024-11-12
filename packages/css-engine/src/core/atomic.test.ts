import { test, expect } from "vitest";
import { createRegularStyleSheet } from "./create-style-sheet";
import { generateAtomic } from "./atomic";
import type { NestingRule } from "./rules";
import type { StyleValue } from "../schema";

const mediaRuleOptions0 = { minWidth: 0 } as const;
const mediaId0 = "0";

test("use matching media rule", () => {
  const sheet = createRegularStyleSheet();
  sheet.addMediaRule("x");
  const rule = sheet.addNestingRule("");
  rule.setDeclaration({
    breakpoint: "x",
    selector: "",
    property: "marginTop",
    value: { type: "keyword", value: "auto" },
  });
  rule.setDeclaration({
    breakpoint: "x",
    selector: "",
    property: "color",
    value: { type: "keyword", value: "red" },
  });
  expect(generateAtomic(sheet, { getKey: () => "" }).cssText)
    .toMatchInlineSnapshot(`
"@media all {
  .chcgnqf {
    margin-top: auto
  }
  .cen0ymu {
    color: red
  }
}"
`);
});

test("use nested selector", () => {
  const sheet = createRegularStyleSheet();
  sheet.addMediaRule("x");
  const rule = sheet.addNestingRule("");
  rule.setDeclaration({
    breakpoint: "x",
    selector: ":hover",
    property: "display",
    value: { type: "keyword", value: "block" },
  });
  expect(generateAtomic(sheet, { getKey: () => "" }).cssText)
    .toMatchInlineSnapshot(`
"@media all {
  .c143pt9k:hover {
    display: block
  }
}"
`);
});

test("added classes", () => {
  const sheet = createRegularStyleSheet();
  sheet.addMediaRule("x");
  const rule = sheet.addNestingRule(".instance");
  rule.setDeclaration({
    breakpoint: "x",
    selector: "",
    property: "display",
    value: { type: "keyword", value: "block" },
  });
  const instances = new Map([[rule, "instanceId"]]);
  const { classes } = generateAtomic(sheet, {
    getKey: (rule) => instances.get(rule) ?? "",
  });
  expect(classes.get("instanceId")).toEqual(["ccqp4le"]);
});

test("rule with multiple properties", () => {
  const sheet = createRegularStyleSheet();
  sheet.addMediaRule(mediaId0, mediaRuleOptions0);
  const rule = sheet.addNestingRule(".instance");
  rule.setDeclaration({
    breakpoint: mediaId0,
    selector: "",
    property: "display",
    value: { type: "keyword", value: "block" },
  });
  rule.setDeclaration({
    breakpoint: mediaId0,
    selector: "",
    property: "color",
    value: { type: "keyword", value: "red" },
  });
  expect(generateAtomic(sheet, { getKey: () => "" }).cssText)
    .toMatchInlineSnapshot(`
"@media all and (min-width: 0px) {
  .c1qg54vh {
    display: block
  }
  .ckgcokb {
    color: red
  }
}"
`);
});

test("share atomic rules", () => {
  const sheet = createRegularStyleSheet();
  sheet.addMediaRule("x");
  const rule1 = sheet.addNestingRule("1");
  rule1.setDeclaration({
    breakpoint: "x",
    selector: "",
    property: "display",
    value: { type: "keyword", value: "block" },
  });
  rule1.setDeclaration({
    breakpoint: "x",
    selector: "",
    property: "color",
    value: { type: "keyword", value: "red" },
  });
  const rule2 = sheet.addNestingRule("2");
  rule2.setDeclaration({
    breakpoint: "x",
    selector: "",
    property: "display",
    value: { type: "keyword", value: "block" },
  });
  const instances = new Map([
    [rule1, "1"],
    [rule2, "2"],
  ]);
  const { cssText, classes } = generateAtomic(sheet, {
    getKey: (rule) => instances.get(rule) ?? "",
  });
  expect(cssText).toMatchInlineSnapshot(`
"@media all {
  .ccqp4le {
    display: block
  }
  .cen0ymu {
    color: red
  }
}"
`);
  expect(classes.get("1")).toEqual(["ccqp4le", "cen0ymu"]);
  expect(classes.get("2")).toEqual(["ccqp4le"]);
});

test("distinct similar declarations from different breakpoints", () => {
  const sheet = createRegularStyleSheet();
  sheet.addMediaRule("a");
  sheet.addMediaRule("b");
  const rule1 = sheet.addNestingRule("1");
  rule1.setDeclaration({
    breakpoint: "a",
    selector: "",
    property: "display",
    value: { type: "keyword", value: "block" },
  });
  rule1.setDeclaration({
    breakpoint: "b",
    selector: "",
    property: "display",
    value: { type: "keyword", value: "block" },
  });
  expect(generateAtomic(sheet, { getKey: () => "" }).cssText)
    .toMatchInlineSnapshot(`
"@media all {
  .cumb2su {
    display: block
  }
}
@media all {
  .c1u3btle {
    display: block
  }
}"
`);
});

test("support descendant suffix", () => {
  const sheet = createRegularStyleSheet();
  sheet.addMediaRule("x");
  const rule1 = sheet.addNestingRule("instance");
  rule1.setDeclaration({
    breakpoint: "x",
    selector: ":hover",
    property: "display",
    value: { type: "keyword", value: "block" },
  });
  const rule2 = sheet.addNestingRule("instance", " img");
  rule2.setDeclaration({
    breakpoint: "x",
    selector: ":hover",
    property: "display",
    value: { type: "keyword", value: "block" },
  });
  expect(generateAtomic(sheet, { getKey: () => "" }).cssText)
    .toMatchInlineSnapshot(`
"@media all {
  .c143pt9k:hover {
    display: block
  }
  .cpdl2lp img:hover {
    display: block
  }
}"
`);
});

test("generate prefixed and unprefixed in the same rule", () => {
  const sheet = createRegularStyleSheet();
  sheet.addMediaRule("x");
  const rule = sheet.addNestingRule("instance");
  rule.setDeclaration({
    breakpoint: "x",
    selector: "",
    property: "textSizeAdjust",
    value: { type: "keyword", value: "auto" },
  });
  expect(generateAtomic(sheet, { getKey: () => "" }).cssText)
    .toMatchInlineSnapshot(`
"@media all {
  .c1h1gugw {
    -webkit-text-size-adjust: auto;
    text-size-adjust: auto
  }
}"
`);
});

test("generate merged properties as single rule", () => {
  const sheet = createRegularStyleSheet();
  sheet.addMediaRule("x");
  const setMargins = (rule: NestingRule, value: StyleValue) => {
    rule.setDeclaration({
      breakpoint: "x",
      selector: "",
      property: "marginTop",
      value,
    });
    rule.setDeclaration({
      breakpoint: "x",
      selector: "",
      property: "marginRight",
      value,
    });
    rule.setDeclaration({
      breakpoint: "x",
      selector: "",
      property: "marginBottom",
      value,
    });
    rule.setDeclaration({
      breakpoint: "x",
      selector: "",
      property: "marginLeft",
      value,
    });
  };
  setMargins(sheet.addNestingRule("instance"), {
    type: "keyword",
    value: "auto",
  });
  setMargins(sheet.addNestingRule("instance", " img"), {
    type: "unit",
    value: 10,
    unit: "px",
  });
  expect(generateAtomic(sheet, { getKey: () => "" }).cssText)
    .toMatchInlineSnapshot(`
"@media all {
  .cdj9gv4 {
    margin: auto
  }
  .c340vfr img {
    margin: 10px
  }
}"
`);
});
