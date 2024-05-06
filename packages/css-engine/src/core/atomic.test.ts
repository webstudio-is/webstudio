import { test, expect } from "@jest/globals";
import { createRegularStyleSheet } from "./create-style-sheet";
import { generateAtomic } from "./atomic";

const mediaRuleOptions0 = { minWidth: 0 } as const;
const mediaId0 = "0";

test("use matching media rule", () => {
  const sheet = createRegularStyleSheet();
  sheet.addMediaRule("x");
  const rule = sheet.addNestingRule("");
  rule.setDeclaration({
    breakpoint: "x",
    selector: "",
    property: "display",
    value: { type: "keyword", value: "block" },
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
  .ccqp4le {
    display: block
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
  const { classesMap } = generateAtomic(sheet, {
    getKey: (rule) => instances.get(rule) ?? "",
  });
  expect(classesMap.get("instanceId")).toEqual(["ccqp4le"]);
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
  const { cssText, classesMap } = generateAtomic(sheet, {
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
  expect(classesMap.get("1")).toEqual(["ccqp4le", "cen0ymu"]);
  expect(classesMap.get("2")).toEqual(["ccqp4le"]);
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

test("support descendent suffix", () => {
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
