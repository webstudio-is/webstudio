import { CssEngine } from "./css-engine";
import { VirtualStyleSheet } from "./style-sheet";

const style0 = {
  display: { type: "keyword", value: "block" },
} as const;

const breakpoint0 = { minWidth: 0, id: "0", label: "0" } as const;

describe("CssEngine", () => {
  let engine: CssEngine;

  beforeEach(() => {
    const sheet = new VirtualStyleSheet();
    engine = new CssEngine(sheet);
  });

  test("throw when breakpoint is not registered", () => {
    expect(() => {
      engine.addRule({
        style: style0,
        breakpoint: "0",
      });
    }).toThrowErrorMatchingInlineSnapshot(`"Unknown breakpoint: 0"`);
  });

  test("rule with multiple properties", () => {
    engine.addBreakpoint(breakpoint0);
    engine.addRule({
      style: {
        ...style0,
        color: { type: "keyword", value: "red" },
      },
      breakpoint: "0",
    });
    expect(engine.cssText).toMatchInlineSnapshot(`
      "@media (min-width: 0px) {
        .s0 { display: block; color: red }
      }"
    `);
  });

  test("add one rule", () => {
    engine.addBreakpoint(breakpoint0);
    const rule = engine.addRule({
      style: {
        ...style0,
        color: { type: "keyword", value: "red" },
      },
      breakpoint: "0",
    });
    expect(engine.cssText).toMatchInlineSnapshot(`
      "@media (min-width: 0px) {
        .s0 { display: block; color: red }
      }"
    `);
    expect(rule.cssText).toMatchInlineSnapshot(
      `".s0 { display: block; color: red }"`
    );
  });

  test("skip breakpoint without rules", () => {
    engine.addBreakpoint(breakpoint0);
    expect(engine.cssText).toBe("");
  });

  test("multiple breakpoints", () => {
    engine.addBreakpoint(breakpoint0);
    engine.addBreakpoint({ minWidth: 100, id: "1", label: "1" });
    engine.addRule({
      style: style0,
      breakpoint: "0",
    });
    engine.addRule({
      style: style0,
      breakpoint: "1",
    });
    expect(engine.cssText).toMatchInlineSnapshot(`
      "@media (min-width: 0px) {
        .s0 { display: block }
      }
      @media (min-width: 100px) {
        .s1 { display: block }
      }"
    `);
  });
});
