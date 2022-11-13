import { CssEngine } from "./css-engine";

const style0 = {
  display: { type: "keyword", value: "block" },
} as const;

const breakpoint0 = { minWidth: 0, id: "0", label: "0" } as const;

describe("CssEngine", () => {
  let engine: CssEngine;

  beforeEach(() => {
    engine = new CssEngine();
  });

  test("throw when breakpoint is not registered", () => {
    expect(() => {
      engine.addRule(".c", {
        style: style0,
        breakpoint: "0",
      });
    }).toThrowErrorMatchingInlineSnapshot(`"Unknown breakpoint: 0"`);
  });

  test("rule with multiple properties", () => {
    engine.addBreakpoint(breakpoint0);
    engine.addRule(".c", {
      style: {
        ...style0,
        color: { type: "keyword", value: "red" },
      },
      breakpoint: "0",
    });
    expect(engine.cssText).toMatchInlineSnapshot(`
      "@media (min-width: 0px) {
        .c { display: block; color: red }
      }"
    `);
  });

  test("hyphenate property", () => {
    engine.addBreakpoint(breakpoint0);
    engine.addRule(".c", {
      style: {
        backgroundColor: { type: "keyword", value: "red" },
      },
      breakpoint: "0",
    });
    expect(engine.cssText).toMatchInlineSnapshot(`
      "@media (min-width: 0px) {
        .c { background-color: red }
      }"
    `);
  });

  test("add rule", () => {
    engine.addBreakpoint(breakpoint0);
    const rule1 = engine.addRule(".c", {
      style: {
        ...style0,
        color: { type: "keyword", value: "red" },
      },
      breakpoint: "0",
    });
    expect(engine.cssText).toMatchInlineSnapshot(`
      "@media (min-width: 0px) {
        .c { display: block; color: red }
      }"
    `);
    expect(rule1.cssText).toMatchInlineSnapshot(
      `".c { display: block; color: red }"`
    );
    engine.addRule(".c2", {
      style: {
        ...style0,
        color: { type: "keyword", value: "green" },
      },
      breakpoint: "0",
    });
    expect(engine.cssText).toMatchInlineSnapshot(`
      "@media (min-width: 0px) {
        .c { display: block; color: red }
        .c2 { display: block; color: green }
      }"
    `);
  });

  test("update rule", () => {
    engine.addBreakpoint(breakpoint0);
    const rule = engine.addRule(".c", {
      style: {
        ...style0,
        color: { type: "keyword", value: "red" },
      },
      breakpoint: "0",
    });
    expect(engine.cssText).toMatchInlineSnapshot(`
      "@media (min-width: 0px) {
        .c { display: block; color: red }
      }"
    `);
    expect(rule.cssText).toMatchInlineSnapshot(
      `".c { display: block; color: red }"`
    );

    rule.styleMap.set("color", { type: "keyword", value: "green" });

    expect(rule.cssText).toMatchInlineSnapshot(
      `".c { display: block; color: green }"`
    );

    expect(engine.cssText).toMatchInlineSnapshot(`
      "@media (min-width: 0px) {
        .c { display: block; color: green }
      }"
    `);
  });

  test("don't override breakpoints", () => {
    engine.addBreakpoint(breakpoint0);
    engine.addRule(".c", {
      style: style0,
      breakpoint: "0",
    });
    expect(engine.cssText).toMatchInlineSnapshot(`
      "@media (min-width: 0px) {
        .c { display: block }
      }"
    `);
    engine.addBreakpoint(breakpoint0);
    expect(engine.cssText).toMatchInlineSnapshot(`
      "@media (min-width: 0px) {
        .c { display: block }
      }"
    `);
  });
});
