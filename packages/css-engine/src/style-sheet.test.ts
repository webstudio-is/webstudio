import { resetRuleCounter, StyleSheet } from "./style-sheet";

const style0 = {
  display: { type: "keyword", value: "block" },
} as const;

const breakpoint0 = { minWidth: 0, id: "0", label: "0" } as const;

describe("StyleSheet", () => {
  beforeEach(() => {
    resetRuleCounter();
  });

  test("throw when breakpoint is not registered", () => {
    const sheet = new StyleSheet();
    expect(() => {
      sheet.addRules([
        {
          style: style0,
          breakpoint: "0",
        },
      ]);
    }).toThrowErrorMatchingInlineSnapshot(`"Unknown breakpoint: 0"`);
  });

  test("rule with multiple properties", () => {
    const sheet = new StyleSheet();
    sheet.addBreakpoints([breakpoint0]);
    sheet.addRules([
      {
        style: {
          ...style0,
          color: { type: "keyword", value: "red" },
        },
        breakpoint: "0",
      },
    ]);
    expect(sheet.toString()).toMatchInlineSnapshot(`
      "@media (min-width: 0px) {
        .s0 { display: block; color: red }
      }"
    `);
  });

  test("skip breakpoint without rules", () => {
    const sheet = new StyleSheet();
    sheet.addBreakpoints([breakpoint0]);
    expect(sheet.toString()).toBe("");
  });

  test("multiple breakpoints", () => {
    const sheet = new StyleSheet();
    sheet.addBreakpoints([breakpoint0, { minWidth: 100, id: "1", label: "1" }]);
    sheet.addRules([
      {
        style: style0,
        breakpoint: "0",
      },
      {
        style: style0,
        breakpoint: "1",
      },
    ]);
    expect(sheet.toString()).toMatchInlineSnapshot(`
      "@media (min-width: 0px) {
        .s0 { display: block }
      }
      @media (min-width: 100px) {
        .s1 { display: block }
      }"
    `);
  });
});
