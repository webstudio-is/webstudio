import { test, expect, describe } from "vitest";
import { atom } from "nanostores";
import { $styles } from "~/shared/nano-states";
import {
  findCssVariableUsagesByInstance,
  validateCssVariableName,
  performCssVariableRename,
  updateVarReferencesInProps,
} from "./css-variable-utils";
import type { StyleDecl, Styles, Prop } from "@webstudio-is/sdk";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-engine";
import { parseCssValue } from "@webstudio-is/css-data";

// Mock the nano-states module
const mockStyles = atom<Styles>(new Map());

// Replace the actual store with our mock
Object.defineProperty($styles, "get", {
  value: () => mockStyles.get(),
});

// Helper to create a StyleDecl
const createStyleDecl = (
  styleSourceId: string,
  breakpointId: string,
  property: string,
  value: string
): StyleDecl => ({
  styleSourceId,
  breakpointId,
  property: property as StyleProperty,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: parseCssValue(property as any, value),
});

describe("validateCssVariableName", () => {
  test("returns required error for empty name", () => {
    mockStyles.set(new Map());

    const error = validateCssVariableName("");
    expect(error).toEqual({
      type: "required",
      message: "CSS variable name cannot be empty",
    });
  });

  test("returns required error for whitespace-only name", () => {
    mockStyles.set(new Map());

    const error = validateCssVariableName("   ");
    expect(error).toEqual({
      type: "required",
      message: "CSS variable name cannot be empty",
    });
  });

  test("returns invalid error for name without --", () => {
    mockStyles.set(new Map());

    const error = validateCssVariableName("my-color");
    expect(error).toEqual({
      type: "invalid",
      message: 'CSS variable name must start with "--"',
    });
  });

  test("returns undefined for valid unique name", () => {
    const styles = new Map([
      [
        "local1:base:--existing::",
        createStyleDecl("local1", "base", "--existing", "red"),
      ],
    ]);
    mockStyles.set(styles);

    const error = validateCssVariableName("--new-color");
    expect(error).toBeUndefined();
  });

  test("returns duplicate error for existing name", () => {
    const styles = new Map([
      [
        "local1:base:--my-color::",
        createStyleDecl("local1", "base", "--my-color", "red"),
      ],
    ]);
    mockStyles.set(styles);

    const error = validateCssVariableName("--my-color");
    expect(error).toEqual({
      type: "duplicate",
      message: 'CSS variable "--my-color" already exists',
    });
  });

  test("allows renaming variable to same name", () => {
    const styles = new Map([
      [
        "local1:base:--my-color::",
        createStyleDecl("local1", "base", "--my-color", "red"),
      ],
    ]);
    mockStyles.set(styles);

    const error = validateCssVariableName("--my-color", "--my-color");
    expect(error).toBeUndefined();
  });
});

describe("findCssVariableUsagesByInstance", () => {
  test("does not track definitions", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--my-color::",
        createStyleDecl("local1", "base", "--my-color", "red"),
      ],
    ]);

    const { counts, instances } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    // Should not track definitions, only var() references
    expect(counts.size).toBe(0);
    expect(instances.size).toBe(0);
  });

  test("tracks var() references", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
      [
        "box2",
        {
          instanceId: "box2",
          values: ["local2"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--primary-color::",
        createStyleDecl("local1", "base", "--primary-color", "blue"),
      ],
      [
        "local2:base:color::",
        createStyleDecl("local2", "base", "color", "var(--primary-color)"),
      ],
    ]);

    const { counts, instances } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.size).toBe(1);
    expect(counts.get("--primary-color")).toBe(1);
    expect(instances.get("--primary-color")).toEqual(new Set(["box2"]));
  });

  test("tracks only var() references not definitions", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
      [
        "box2",
        {
          instanceId: "box2",
          values: ["local2"],
        },
      ],
      [
        "box3",
        {
          instanceId: "box3",
          values: ["local3"],
        },
      ],
    ]);

    const styles = new Map([
      // box1 defines --color
      [
        "local1:base:--color::",
        createStyleDecl("local1", "base", "--color", "red"),
      ],
      // box2 uses --color
      [
        "local2:base:backgroundColor::",
        createStyleDecl("local2", "base", "backgroundColor", "var(--color)"),
      ],
      // box3 defines and uses --color
      [
        "local3:base:--color::",
        createStyleDecl("local3", "base", "--color", "blue"),
      ],
      [
        "local3:base:color::",
        createStyleDecl("local3", "base", "color", "var(--color)"),
      ],
    ]);

    const { counts, instances } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.size).toBe(1);
    expect(counts.get("--color")).toBe(2);
    // Only box2 and box3 use var(--color), box1 only defines it
    expect(instances.get("--color")).toEqual(new Set(["box2", "box3"]));
  });

  test("handles multiple variables", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--color::",
        createStyleDecl("local1", "base", "--color", "red"),
      ],
      [
        "local1:base:--size::",
        createStyleDecl("local1", "base", "--size", "16px"),
      ],
      [
        "local1:base:fontSize::",
        createStyleDecl("local1", "base", "fontSize", "var(--size)"),
      ],
    ]);

    const { counts, instances } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.size).toBe(1);
    // --color is only defined, not used
    expect(counts.get("--color")).toBeUndefined();
    // --size is used via var()
    expect(counts.get("--size")).toBe(1);
    expect(instances.get("--size")).toEqual(new Set(["box1"]));
  });

  test("distinguishes between definition and usage", () => {
    const styleSourceSelections = new Map([
      [
        "definer",
        {
          instanceId: "definer",
          values: ["definerLocal"],
        },
      ],
      [
        "user",
        {
          instanceId: "user",
          values: ["userLocal"],
        },
      ],
    ]);

    const styles = new Map([
      // definer instance defines the variable
      [
        "definerLocal:base:--theme-color::",
        createStyleDecl("definerLocal", "base", "--theme-color", "blue"),
      ],
      // user instance uses the variable
      [
        "userLocal:base:color::",
        createStyleDecl("userLocal", "base", "color", "var(--theme-color)"),
      ],
    ]);

    const { counts, instances } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.size).toBe(1);
    expect(counts.get("--theme-color")).toBe(1);
    // Should only track the user, not the definer
    expect(instances.get("--theme-color")).toEqual(new Set(["user"]));
    expect(instances.get("--theme-color")?.has("definer")).toBe(false);
  });

  test("counts multiple references on same instance", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--spacing::",
        createStyleDecl("local1", "base", "--spacing", "16px"),
      ],
      // Same instance uses the variable three times
      [
        "local1:base:marginTop::",
        createStyleDecl("local1", "base", "marginTop", "var(--spacing)"),
      ],
      [
        "local1:base:marginBottom::",
        createStyleDecl("local1", "base", "marginBottom", "var(--spacing)"),
      ],
      [
        "local1:base:padding::",
        createStyleDecl("local1", "base", "padding", "var(--spacing)"),
      ],
    ]);

    const { counts, instances } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.size).toBe(1);
    // Should count all 3 usages, not just 1
    expect(counts.get("--spacing")).toBe(3);
    // But only 1 instance
    expect(instances.get("--spacing")).toEqual(new Set(["box1"]));
  });

  test("handles unparsed values with var()", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    // parseCssValue returns unparsed type for calc() expressions
    // Now we DO track var() inside unparsed strings
    const styles = new Map([
      [
        "local1:base:--spacing::",
        createStyleDecl("local1", "base", "--spacing", "16px"),
      ],
      [
        "local1:base:width::",
        createStyleDecl("local1", "base", "width", "calc(var(--spacing) * 2)"),
      ],
    ]);

    const { counts, instances } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    // Should track var() references inside unparsed calc() expressions
    expect(counts.size).toBe(1);
    expect(counts.get("--spacing")).toBe(1);
    expect(instances.get("--spacing")).toEqual(new Set(["box1"]));
  });

  test("tracks var() inside calc() function", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--test1::",
        createStyleDecl("local1", "base", "--test1", "10px"),
      ],
      [
        "local1:base:width::",
        createStyleDecl("local1", "base", "width", "calc(var(--test1))"),
      ],
    ]);

    const { counts, instances } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    // Should track var() references inside calc() expressions
    expect(counts.size).toBe(1);
    expect(counts.get("--test1")).toBe(1);
    expect(instances.get("--test1")).toEqual(new Set(["box1"]));
  });

  test("tracks var() inside complex calc() with multiple variables", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--spacing::",
        createStyleDecl("local1", "base", "--spacing", "10px"),
      ],
      [
        "local1:base:--multiplier::",
        createStyleDecl("local1", "base", "--multiplier", "2"),
      ],
      [
        "local1:base:width::",
        createStyleDecl(
          "local1",
          "base",
          "width",
          "calc(var(--spacing) * var(--multiplier))"
        ),
      ],
    ]);

    const { counts, instances } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.size).toBe(2);
    expect(counts.get("--spacing")).toBe(1);
    expect(counts.get("--multiplier")).toBe(1);
    expect(instances.get("--spacing")).toEqual(new Set(["box1"]));
    expect(instances.get("--multiplier")).toEqual(new Set(["box1"]));
  });

  test("tracks var() with fallback values", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--primary-color::",
        createStyleDecl("local1", "base", "--primary-color", "red"),
      ],
      [
        "local1:base:color::",
        createStyleDecl(
          "local1",
          "base",
          "color",
          "var(--primary-color, blue)"
        ),
      ],
    ]);

    const { counts, instances } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.get("--primary-color")).toBe(1);
    expect(instances.get("--primary-color")).toEqual(new Set(["box1"]));
  });

  test("tracks var() with nested fallbacks", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--primary::",
        createStyleDecl("local1", "base", "--primary", "blue"),
      ],
      [
        "local1:base:--secondary::",
        createStyleDecl("local1", "base", "--secondary", "green"),
      ],
      [
        "local1:base:color::",
        createStyleDecl(
          "local1",
          "base",
          "color",
          "var(--primary, var(--secondary, red))"
        ),
      ],
    ]);

    const { counts, instances } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.get("--primary")).toBe(1);
    expect(counts.get("--secondary")).toBe(1);
  });

  test("tracks var() with CSS variable as fallback (var(--primary, --fallback))", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--primary::",
        createStyleDecl("local1", "base", "--primary", "blue"),
      ],
      [
        "local1:base:--fallback::",
        createStyleDecl("local1", "base", "--fallback", "red"),
      ],
      [
        "local1:base:color::",
        createStyleDecl(
          "local1",
          "base",
          "color",
          "var(--primary, --fallback)"
        ),
      ],
    ]);

    const { counts, instances } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    // Both the primary and fallback variable should be tracked
    expect(counts.get("--primary")).toBe(1);
    expect(counts.get("--fallback")).toBe(1);
    expect(instances.get("--primary")).toEqual(new Set(["box1"]));
    expect(instances.get("--fallback")).toEqual(new Set(["box1"]));
  });

  test("tracks multiple var() with variable fallbacks in same value", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--color1::",
        createStyleDecl("local1", "base", "--color1", "red"),
      ],
      [
        "local1:base:--color2::",
        createStyleDecl("local1", "base", "--color2", "blue"),
      ],
      [
        "local1:base:--fallback1::",
        createStyleDecl("local1", "base", "--fallback1", "yellow"),
      ],
      [
        "local1:base:--fallback2::",
        createStyleDecl("local1", "base", "--fallback2", "green"),
      ],
      [
        "local1:base:background::",
        createStyleDecl(
          "local1",
          "base",
          "background",
          "linear-gradient(var(--color1, --fallback1), var(--color2, --fallback2))"
        ),
      ],
    ]);

    const { counts } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.get("--color1")).toBe(1);
    expect(counts.get("--color2")).toBe(1);
    expect(counts.get("--fallback1")).toBe(1);
    expect(counts.get("--fallback2")).toBe(1);
  });

  test("tracks deeply nested var() with variable fallbacks", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--first::",
        createStyleDecl("local1", "base", "--first", "value"),
      ],
      [
        "local1:base:--second::",
        createStyleDecl("local1", "base", "--second", "value"),
      ],
      [
        "local1:base:--third::",
        createStyleDecl("local1", "base", "--third", "value"),
      ],
      [
        "local1:base:color::",
        createStyleDecl(
          "local1",
          "base",
          "color",
          "var(--first, var(--second, --third))"
        ),
      ],
    ]);

    const { counts } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.get("--first")).toBe(1);
    expect(counts.get("--second")).toBe(1);
    expect(counts.get("--third")).toBe(1);
  });

  test("tracks variables in gradient", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--angle::",
        createStyleDecl("local1", "base", "--angle", "45deg"),
      ],
      [
        "local1:base:--color1::",
        createStyleDecl("local1", "base", "--color1", "red"),
      ],
      [
        "local1:base:--color2::",
        createStyleDecl("local1", "base", "--color2", "blue"),
      ],
      [
        "local1:base:backgroundImage::",
        createStyleDecl(
          "local1",
          "base",
          "backgroundImage",
          "linear-gradient(var(--angle), var(--color1), var(--color2))"
        ),
      ],
    ]);

    const { counts, instances } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.get("--angle")).toBe(1);
    expect(counts.get("--color1")).toBe(1);
    expect(counts.get("--color2")).toBe(1);
  });

  test("tracks variables with hyphens and numbers", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--spacing-level-1::",
        createStyleDecl("local1", "base", "--spacing-level-1", "10px"),
      ],
      [
        "local1:base:padding::",
        createStyleDecl("local1", "base", "padding", "var(--spacing-level-1)"),
      ],
    ]);

    const { counts, instances } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.get("--spacing-level-1")).toBe(1);
  });

  test("does not track variable definitions as usages", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--primary-color::",
        createStyleDecl("local1", "base", "--primary-color", "blue"),
      ],
    ]);

    const { counts, instances } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    // Defining --primary-color should not count as using it
    expect(counts.size).toBe(0);
  });

  test("tracks var() in HTML Embed code", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--primary-color::",
        createStyleDecl("local1", "base", "--primary-color", "blue"),
      ],
      [
        "local1:base:--bg-color::",
        createStyleDecl("local1", "base", "--bg-color", "white"),
      ],
    ]);

    const props = new Map([
      [
        "prop1",
        {
          id: "prop1",
          instanceId: "box1",
          type: "string" as const,
          name: "code",
          value: `<style>
          .my-class {
            color: var(--primary-color);
            background: var(--bg-color);
          }
        </style>`,
        },
      ],
    ]);

    const { counts, instances } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props,
    });

    expect(counts.get("--primary-color")).toBe(1);
    expect(counts.get("--bg-color")).toBe(1);
    expect(instances.get("--primary-color")?.has("box1")).toBe(true);
    expect(instances.get("--bg-color")?.has("box1")).toBe(true);
  });
});

describe("performCssVariableRename", () => {
  test("updates property declarations", () => {
    const styles = new Map<string, StyleDecl>([
      [
        "styleSourceId:base:--my-color",
        {
          breakpointId: "base",
          styleSourceId: "styleSourceId",
          property: "--my-color" as StyleProperty,
          value: { type: "keyword", value: "red" },
        },
      ],
    ]);

    const result = performCssVariableRename(
      styles,
      "--my-color",
      "--new-color"
    );

    expect(result.size).toBe(1);
    const [decl] = Array.from(result.values());
    expect(decl.property).toBe("--new-color");
    expect(decl.value).toEqual({ type: "keyword", value: "red" });
  });

  test("updates var() references", () => {
    const styles = new Map<string, StyleDecl>([
      [
        "styleSourceId:base:--my-color",
        {
          breakpointId: "base",
          styleSourceId: "styleSourceId",
          property: "--my-color" as StyleProperty,
          value: { type: "keyword", value: "red" },
        },
      ],
      [
        "styleSourceId:base:color",
        {
          breakpointId: "base",
          styleSourceId: "styleSourceId",
          property: "color" as StyleProperty,
          value: { type: "var", value: "my-color" },
        },
      ],
    ]);

    const result = performCssVariableRename(
      styles,
      "--my-color",
      "--new-color"
    );

    expect(result.size).toBe(2);
    const colorDecl = Array.from(result.values()).find(
      (d) => d.property === "color"
    );
    expect(colorDecl?.value).toEqual({ type: "var", value: "new-color" });
  });

  test("updates nested var() references", () => {
    const styles = new Map<string, StyleDecl>([
      [
        "styleSourceId:base:transform",
        {
          breakpointId: "base",
          styleSourceId: "styleSourceId",
          property: "transform" as StyleProperty,
          value: {
            type: "function",
            name: "rotate",
            args: {
              type: "var",
              value: "rotation-angle",
            },
          } as StyleValue,
        },
      ],
    ]);

    const result = performCssVariableRename(
      styles,
      "--rotation-angle",
      "--angle"
    );

    const transformDecl = Array.from(result.values())[0];
    expect(transformDecl.value).toMatchObject({
      type: "function",
      name: "rotate",
      args: {
        type: "var",
        value: "angle",
      },
    });
  });

  test("updates array of var() references", () => {
    const styles = new Map<string, StyleDecl>([
      [
        "styleSourceId:base:boxShadow",
        {
          breakpointId: "base",
          styleSourceId: "styleSourceId",
          property: "boxShadow" as StyleProperty,
          value: {
            type: "tuple",
            value: [
              { type: "var", value: "shadow-x" },
              { type: "var", value: "shadow-y" },
              { type: "var", value: "shadow-color" },
            ],
          },
        },
      ],
    ]);

    const result = performCssVariableRename(
      styles,
      "--shadow-color",
      "--color-shadow"
    );

    const shadowDecl = Array.from(result.values())[0];
    expect(shadowDecl.value).toMatchObject({
      type: "tuple",
      value: [
        { type: "var", value: "shadow-x" },
        { type: "var", value: "shadow-y" },
        { type: "var", value: "color-shadow" },
      ],
    });
  });

  test("updates var() with CSS variable fallback", () => {
    const styles = new Map<string, StyleDecl>([
      [
        "styleSourceId:base:color",
        {
          breakpointId: "base",
          styleSourceId: "styleSourceId",
          property: "color" as StyleProperty,
          value: {
            type: "var",
            value: "primary",
            fallback: { type: "var", value: "fallback-color" },
          } as StyleValue,
        },
      ],
    ]);

    const result = performCssVariableRename(
      styles,
      "--fallback-color",
      "--default-color"
    );

    const colorDecl = Array.from(result.values())[0];
    expect(colorDecl.value).toMatchObject({
      type: "var",
      value: "primary",
      fallback: { type: "var", value: "default-color" },
    });
  });

  test("updates primary variable when it has a fallback", () => {
    const styles = new Map<string, StyleDecl>([
      [
        "styleSourceId:base:color",
        {
          breakpointId: "base",
          styleSourceId: "styleSourceId",
          property: "color" as StyleProperty,
          value: {
            type: "var",
            value: "old-primary",
            fallback: { type: "keyword", value: "blue" },
          } as StyleValue,
        },
      ],
    ]);

    const result = performCssVariableRename(
      styles,
      "--old-primary",
      "--new-primary"
    );

    const colorDecl = Array.from(result.values())[0];
    expect(colorDecl.value).toMatchObject({
      type: "var",
      value: "new-primary",
      fallback: { type: "keyword", value: "blue" },
    });
  });

  test("updates both primary and fallback when renaming appears in both", () => {
    const styles = new Map<string, StyleDecl>([
      [
        "styleSourceId:base:color",
        {
          breakpointId: "base",
          styleSourceId: "styleSourceId",
          property: "color" as StyleProperty,
          value: {
            type: "var",
            value: "theme-color",
            fallback: { type: "var", value: "theme-color" },
          } as StyleValue,
        },
      ],
    ]);

    const result = performCssVariableRename(
      styles,
      "--theme-color",
      "--brand-color"
    );

    const colorDecl = Array.from(result.values())[0];
    expect(colorDecl.value).toMatchObject({
      type: "var",
      value: "brand-color",
      fallback: { type: "var", value: "brand-color" },
    });
  });

  test("handles multiple declarations of same variable", () => {
    const styles = new Map<string, StyleDecl>([
      [
        "styleSourceId1:base:--my-var",
        {
          breakpointId: "base",
          styleSourceId: "styleSourceId1",
          property: "--my-var" as StyleProperty,
          value: { type: "keyword", value: "value1" },
        },
      ],
      [
        "styleSourceId2:base:--my-var",
        {
          breakpointId: "base",
          styleSourceId: "styleSourceId2",
          property: "--my-var" as StyleProperty,
          value: { type: "keyword", value: "value2" },
        },
      ],
    ]);

    const result = performCssVariableRename(styles, "--my-var", "--renamed");

    expect(result.size).toBe(2);
    const decls = Array.from(result.values());
    expect(decls.every((d) => d.property === "--renamed")).toBe(true);
  });

  test("does not modify unrelated variables", () => {
    const styles = new Map<string, StyleDecl>([
      [
        "styleSourceId:base:--my-color",
        {
          breakpointId: "base",
          styleSourceId: "styleSourceId",
          property: "--my-color" as StyleProperty,
          value: { type: "keyword", value: "red" },
        },
      ],
      [
        "styleSourceId:base:--other-color",
        {
          breakpointId: "base",
          styleSourceId: "styleSourceId",
          property: "--other-color" as StyleProperty,
          value: { type: "keyword", value: "blue" },
        },
      ],
      [
        "styleSourceId:base:color",
        {
          breakpointId: "base",
          styleSourceId: "styleSourceId",
          property: "color" as StyleProperty,
          value: { type: "var", value: "other-color" },
        },
      ],
    ]);

    const result = performCssVariableRename(
      styles,
      "--my-color",
      "--new-color"
    );

    expect(result.size).toBe(3);
    const otherColorDecl = Array.from(result.values()).find(
      (d) => d.property === "--other-color"
    );
    expect(otherColorDecl?.property).toBe("--other-color");

    const colorDecl = Array.from(result.values()).find(
      (d) => d.property === "color"
    );
    expect(colorDecl?.value).toEqual({ type: "var", value: "other-color" });
  });

  test("handles values with no references", () => {
    const styles = new Map<string, StyleDecl>([
      [
        "styleSourceId:base:--my-color",
        {
          breakpointId: "base",
          styleSourceId: "styleSourceId",
          property: "--my-color" as StyleProperty,
          value: { type: "keyword", value: "red" },
        },
      ],
      [
        "styleSourceId:base:fontSize",
        {
          breakpointId: "base",
          styleSourceId: "styleSourceId",
          property: "fontSize" as StyleProperty,
          value: { type: "unit", value: 16, unit: "px" },
        },
      ],
    ]);

    const result = performCssVariableRename(
      styles,
      "--my-color",
      "--new-color"
    );

    expect(result.size).toBe(2);
    const fontSizeDecl = Array.from(result.values()).find(
      (d) => d.property === "fontSize"
    );
    // Value should be unchanged
    expect(fontSizeDecl?.value).toEqual({
      type: "unit",
      value: 16,
      unit: "px",
    });
  });
});

describe("renameCssVariable", () => {
  test("updates var() references in HTML Embed code", () => {
    const props = new Map([
      [
        "prop1",
        {
          id: "prop1",
          instanceId: "embed1",
          name: "code",
          type: "string" as const,
          value: `<style>
  .custom { 
    color: var(--theme-color);
    background: var(--theme-color, blue);
  }
</style>`,
        },
      ],
    ]);

    const oldProperty = "--theme-color";
    const newProperty = "--brand-color";

    // Simulate the rename logic for props
    const regex = new RegExp(
      `var\\(\\s*${oldProperty.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "g"
    );
    const prop = props.get("prop1");
    const updatedValue = prop!.value.replace(regex, `var(${newProperty}`);

    // Verify both occurrences were replaced
    expect(updatedValue).toContain("var(--brand-color)");
    expect(updatedValue).not.toContain("var(--theme-color)");
    expect(updatedValue).toContain("var(--brand-color, blue)");

    // Verify the original had the old name
    expect(prop!.value).toContain("var(--theme-color)");
  });
});

describe("updateVarReferencesInProps", () => {
  test("updates single var() reference in HTML Embed code", () => {
    const props = new Map<string, Prop>([
      [
        "prop1",
        {
          id: "prop1",
          instanceId: "instance1",
          name: "code",
          type: "string",
          value: '<div style="color: var(--primary)">Text</div>',
        },
      ],
    ]);

    const result = updateVarReferencesInProps(
      props,
      "--primary",
      "--main-color"
    );
    const prop = result.get("prop1");

    expect(prop!.value).toBe(
      '<div style="color: var(--main-color)">Text</div>'
    );
    expect(prop!.value).not.toContain("--primary");
  });

  test("updates multiple occurrences in same prop", () => {
    const props = new Map<string, Prop>([
      [
        "prop1",
        {
          id: "prop1",
          instanceId: "instance1",
          name: "code",
          type: "string",
          value: "var(--color) and var(--color, red)",
        },
      ],
    ]);

    const result = updateVarReferencesInProps(props, "--color", "--new-color");
    const prop = result.get("prop1");

    expect(prop!.value).toBe("var(--new-color) and var(--new-color, red)");
    expect(prop!.value).not.toContain("var(--color");
  });

  test("preserves fallback values", () => {
    const props = new Map<string, Prop>([
      [
        "prop1",
        {
          id: "prop1",
          instanceId: "instance1",
          name: "code",
          type: "string",
          value: "var(--bg, #fff)",
        },
      ],
    ]);

    const result = updateVarReferencesInProps(props, "--bg", "--background");
    const prop = result.get("prop1");

    expect(prop!.value).toBe("var(--background, #fff)");
  });

  test("updates var() with CSS variable fallback", () => {
    const props = new Map<string, Prop>([
      [
        "prop1",
        {
          id: "prop1",
          instanceId: "instance1",
          name: "code",
          type: "string",
          value: "color: var(--primary, --fallback);",
        },
      ],
    ]);

    const result = updateVarReferencesInProps(props, "--fallback", "--default");
    const prop = result.get("prop1");

    expect(prop!.value).toBe("color: var(--primary, --default);");
  });

  test("updates primary in var() with CSS variable fallback", () => {
    const props = new Map<string, Prop>([
      [
        "prop1",
        {
          id: "prop1",
          instanceId: "instance1",
          name: "code",
          type: "string",
          value: "color: var(--primary, --fallback);",
        },
      ],
    ]);

    const result = updateVarReferencesInProps(props, "--primary", "--main");
    const prop = result.get("prop1");

    expect(prop!.value).toBe("color: var(--main, --fallback);");
  });

  test("updates multiple variables in var() with multiple fallbacks", () => {
    const props = new Map<string, Prop>([
      [
        "prop1",
        {
          id: "prop1",
          instanceId: "instance1",
          name: "code",
          type: "string",
          value:
            "background: linear-gradient(var(--color1, --fb1), var(--color2, --fb2));",
        },
      ],
    ]);

    const result = updateVarReferencesInProps(props, "--color1", "--primary");
    const prop = result.get("prop1");

    expect(prop!.value).toBe(
      "background: linear-gradient(var(--primary, --fb1), var(--color2, --fb2));"
    );
  });

  test("updates nested var() with variable fallbacks", () => {
    const props = new Map<string, Prop>([
      [
        "prop1",
        {
          id: "prop1",
          instanceId: "instance1",
          name: "code",
          type: "string",
          value: "color: var(--first, var(--second, --third));",
        },
      ],
    ]);

    const result = updateVarReferencesInProps(props, "--second", "--backup");
    const prop = result.get("prop1");

    expect(prop!.value).toBe("color: var(--first, var(--backup, --third));");
  });

  test("handles special regex characters in variable name", () => {
    const props = new Map<string, Prop>([
      [
        "prop1",
        {
          id: "prop1",
          instanceId: "instance1",
          name: "code",
          type: "string",
          value: "var(--color-$special)",
        },
      ],
    ]);

    const result = updateVarReferencesInProps(
      props,
      "--color-$special",
      "--normal"
    );
    const prop = result.get("prop1");

    expect(prop!.value).toBe("var(--normal)");
  });

  test("does not update when no matches found", () => {
    const props = new Map<string, Prop>([
      [
        "prop1",
        {
          id: "prop1",
          instanceId: "instance1",
          name: "code",
          type: "string",
          value: "var(--other)",
        },
      ],
    ]);

    const result = updateVarReferencesInProps(props, "--primary", "--main");
    const prop = result.get("prop1");

    expect(prop!.value).toBe("var(--other)");
  });

  test("ignores non-code props", () => {
    const props = new Map<string, Prop>([
      [
        "prop1",
        {
          id: "prop1",
          instanceId: "instance1",
          name: "className",
          type: "string",
          value: "var(--color)",
        },
      ],
    ]);

    const result = updateVarReferencesInProps(props, "--color", "--new-color");
    const prop = result.get("prop1");

    // Should not be updated because name is not "code"
    expect(prop!.value).toBe("var(--color)");
  });

  test("handles empty props map", () => {
    const props = new Map<string, Prop>();

    const result = updateVarReferencesInProps(props, "--primary", "--main");

    expect(result.size).toBe(0);
  });

  test("handles prop with empty value", () => {
    const props = new Map<string, Prop>([
      [
        "prop1",
        {
          id: "prop1",
          instanceId: "instance1",
          name: "code",
          type: "string",
          value: "",
        },
      ],
    ]);

    const result = updateVarReferencesInProps(props, "--color", "--new-color");
    const prop = result.get("prop1");

    expect(prop!.value).toBe("");
  });

  test("handles whitespace variations in var()", () => {
    const props = new Map<string, Prop>([
      [
        "prop1",
        {
          id: "prop1",
          instanceId: "instance1",
          name: "code",
          type: "string",
          value: "var( --spacing ) and var(  --spacing, 10px)",
        },
      ],
    ]);

    const result = updateVarReferencesInProps(
      props,
      "--spacing",
      "--new-spacing"
    );
    const prop = result.get("prop1");

    // Simple regex replacement preserves whitespace
    expect(prop!.value).toBe(
      "var( --new-spacing ) and var(  --new-spacing, 10px)"
    );
  });

  test("uses lookahead to avoid partial matches", () => {
    const props = new Map<string, Prop>([
      [
        "prop1",
        {
          id: "prop1",
          instanceId: "instance1",
          name: "code",
          type: "string",
          value: "var(--color) and var(--color-dark)",
        },
      ],
    ]);

    const result = updateVarReferencesInProps(props, "--color", "--primary");
    const prop = result.get("prop1");

    // Only --color should be updated, not --color-dark (lookahead ensures complete match)
    expect(prop!.value).toBe("var(--primary) and var(--color-dark)");
  });
});

describe("findCssVariableUsagesByInstance - edge cases and malformed syntax", () => {
  test("tracks variables with extra whitespace", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--spacing::",
        createStyleDecl("local1", "base", "--spacing", "10px"),
      ],
      [
        "local1:base:padding::",
        createStyleDecl("local1", "base", "padding", "var( --spacing )"),
      ],
    ]);

    const { counts } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.get("--spacing")).toBe(1);
  });

  test("tracks variables without spaces after var(", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--color::",
        createStyleDecl("local1", "base", "--color", "red"),
      ],
      [
        "local1:base:backgroundColor::",
        createStyleDecl("local1", "base", "backgroundColor", "var(--color)"),
      ],
    ]);

    const { counts } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.get("--color")).toBe(1);
  });

  test("tracks variables in uppercase VAR()", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--size::",
        createStyleDecl("local1", "base", "--size", "20px"),
      ],
      [
        "local1:base:width::",
        createStyleDecl("local1", "base", "width", "VAR(--size)"),
      ],
    ]);

    const { counts } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.get("--size")).toBe(1);
  });

  test("tracks variables with underscores", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--my_variable::",
        createStyleDecl("local1", "base", "--my_variable", "value"),
      ],
      [
        "local1:base:color::",
        createStyleDecl("local1", "base", "color", "var(--my_variable)"),
      ],
    ]);

    const { counts } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.get("--my_variable")).toBe(1);
  });

  test("tracks variables in nested calc expressions", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--base::",
        createStyleDecl("local1", "base", "--base", "10px"),
      ],
      [
        "local1:base:--multiplier::",
        createStyleDecl("local1", "base", "--multiplier", "2"),
      ],
      [
        "local1:base:width::",
        createStyleDecl(
          "local1",
          "base",
          "width",
          "calc(calc(var(--base) * var(--multiplier)) + 5px)"
        ),
      ],
    ]);

    const { counts } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.get("--base")).toBe(1);
    expect(counts.get("--multiplier")).toBe(1);
  });

  test("tracks variables in clamp()", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--min::",
        createStyleDecl("local1", "base", "--min", "10px"),
      ],
      [
        "local1:base:--preferred::",
        createStyleDecl("local1", "base", "--preferred", "5vw"),
      ],
      [
        "local1:base:--max::",
        createStyleDecl("local1", "base", "--max", "50px"),
      ],
      [
        "local1:base:fontSize::",
        createStyleDecl(
          "local1",
          "base",
          "fontSize",
          "clamp(var(--min), var(--preferred), var(--max))"
        ),
      ],
    ]);

    const { counts } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.get("--min")).toBe(1);
    expect(counts.get("--preferred")).toBe(1);
    expect(counts.get("--max")).toBe(1);
  });

  test("tracks variables in min() and max()", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--size-a::",
        createStyleDecl("local1", "base", "--size-a", "100px"),
      ],
      [
        "local1:base:--size-b::",
        createStyleDecl("local1", "base", "--size-b", "50vw"),
      ],
      [
        "local1:base:width::",
        createStyleDecl(
          "local1",
          "base",
          "width",
          "min(var(--size-a), var(--size-b))"
        ),
      ],
    ]);

    const { counts } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.get("--size-a")).toBe(1);
    expect(counts.get("--size-b")).toBe(1);
  });

  test("tracks variables in rgba()", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--red::",
        createStyleDecl("local1", "base", "--red", "255"),
      ],
      [
        "local1:base:--alpha::",
        createStyleDecl("local1", "base", "--alpha", "0.5"),
      ],
      [
        "local1:base:color::",
        createStyleDecl(
          "local1",
          "base",
          "color",
          "rgba(var(--red), 0, 0, var(--alpha))"
        ),
      ],
    ]);

    const { counts } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.get("--red")).toBe(1);
    expect(counts.get("--alpha")).toBe(1);
  });

  test("tracks variables in transform functions", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--rotate::",
        createStyleDecl("local1", "base", "--rotate", "45deg"),
      ],
      [
        "local1:base:--scale::",
        createStyleDecl("local1", "base", "--scale", "1.5"),
      ],
      [
        "local1:base:transform::",
        createStyleDecl(
          "local1",
          "base",
          "transform",
          "rotate(var(--rotate)) scale(var(--scale))"
        ),
      ],
    ]);

    const { counts } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.get("--rotate")).toBe(1);
    expect(counts.get("--scale")).toBe(1);
  });

  test("tracks variables in filter functions", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--blur-amount::",
        createStyleDecl("local1", "base", "--blur-amount", "5px"),
      ],
      [
        "local1:base:filter::",
        createStyleDecl("local1", "base", "filter", "blur(var(--blur-amount))"),
      ],
    ]);

    const { counts } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.get("--blur-amount")).toBe(1);
  });

  test("tracks variables in url() with concatenation", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--image-path::",
        createStyleDecl("local1", "base", "--image-path", "/images/bg.jpg"),
      ],
      [
        "local1:base:backgroundImage::",
        createStyleDecl(
          "local1",
          "base",
          "backgroundImage",
          "url(var(--image-path))"
        ),
      ],
    ]);

    const { counts } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.get("--image-path")).toBe(1);
  });

  test("tracks variables with very long names", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const longVarName =
      "--this-is-a-very-long-variable-name-with-many-hyphens-and-words";

    const styles = new Map([
      [
        `local1:base:${longVarName}::`,
        createStyleDecl("local1", "base", longVarName, "value"),
      ],
      [
        "local1:base:color::",
        createStyleDecl("local1", "base", "color", `var(${longVarName})`),
      ],
    ]);

    const { counts } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.get(longVarName)).toBe(1);
  });

  test("tracks variables in custom properties with var()", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--base-color::",
        createStyleDecl("local1", "base", "--base-color", "blue"),
      ],
      [
        "local1:base:--derived-color::",
        createStyleDecl(
          "local1",
          "base",
          "--derived-color",
          "var(--base-color)"
        ),
      ],
    ]);

    const { counts } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.get("--base-color")).toBe(1);
  });

  test("tracks same variable used multiple times in one value", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--spacing::",
        createStyleDecl("local1", "base", "--spacing", "10px"),
      ],
      [
        "local1:base:padding::",
        createStyleDecl(
          "local1",
          "base",
          "padding",
          "var(--spacing) var(--spacing) var(--spacing) var(--spacing)"
        ),
      ],
    ]);

    const { counts } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    // Should count as 1 usage since it's the same property
    expect(counts.get("--spacing")).toBe(1);
  });

  test("handles variables that look like numbers", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--100::",
        createStyleDecl("local1", "base", "--100", "value"),
      ],
      [
        "local1:base:color::",
        createStyleDecl("local1", "base", "color", "var(--100)"),
      ],
    ]);

    const { counts } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.get("--100")).toBe(1);
  });

  test("tracks variables with emoji (technically valid CSS)", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--😀::",
        createStyleDecl("local1", "base", "--😀", "happy"),
      ],
      [
        "local1:base:content::",
        createStyleDecl("local1", "base", "content", "var(--😀)"),
      ],
    ]);

    const { counts } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.get("--😀")).toBe(1);
  });

  test("tracks variables in grid-template-* properties", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--col-width::",
        createStyleDecl("local1", "base", "--col-width", "1fr"),
      ],
      [
        "local1:base:gridTemplateColumns::",
        createStyleDecl(
          "local1",
          "base",
          "gridTemplateColumns",
          "var(--col-width) var(--col-width) var(--col-width)"
        ),
      ],
    ]);

    const { counts } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.get("--col-width")).toBe(1);
  });

  test("tracks variables in animation properties", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--duration::",
        createStyleDecl("local1", "base", "--duration", "2s"),
      ],
      [
        "local1:base:animationDuration::",
        createStyleDecl(
          "local1",
          "base",
          "animationDuration",
          "var(--duration)"
        ),
      ],
    ]);

    const { counts } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.get("--duration")).toBe(1);
  });

  test("tracks variables in box-shadow with multiple shadows", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--shadow-color::",
        createStyleDecl("local1", "base", "--shadow-color", "rgba(0,0,0,0.2)"),
      ],
      [
        "local1:base:boxShadow::",
        createStyleDecl(
          "local1",
          "base",
          "boxShadow",
          "0 2px 4px var(--shadow-color), 0 4px 8px var(--shadow-color)"
        ),
      ],
    ]);

    const { counts } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.get("--shadow-color")).toBe(1);
  });

  test("tracks variables in incorrect syntax (missing closing paren)", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--color::",
        createStyleDecl("local1", "base", "--color", "red"),
      ],
      [
        "local1:base:backgroundColor::",
        // Malformed - missing closing paren
        createStyleDecl("local1", "base", "backgroundColor", "var(--color"),
      ],
    ]);

    const { counts } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    // Should still track it because we're just searching for the string
    expect(counts.get("--color")).toBe(1);
  });

  test("tracks variables in string concatenation syntax (invalid but user might try)", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--prefix::",
        createStyleDecl("local1", "base", "--prefix", "hello"),
      ],
      [
        "local1:base:content::",
        // Invalid syntax but user might try it
        createStyleDecl("local1", "base", "content", "var(--prefix) + world"),
      ],
    ]);

    const { counts } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.get("--prefix")).toBe(1);
  });

  test("tracks variables with spaces in names (technically invalid)", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--my color::",
        createStyleDecl("local1", "base", "--my color", "red"),
      ],
      [
        "local1:base:color::",
        createStyleDecl("local1", "base", "color", "var(--my color)"),
      ],
    ]);

    const { counts } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    // Should track it even though it's invalid CSS
    expect(counts.get("--my color")).toBe(1);
  });

  test("distinguishes between similar variable names", () => {
    const styleSourceSelections = new Map([
      [
        "box1",
        {
          instanceId: "box1",
          values: ["local1"],
        },
      ],
    ]);

    const styles = new Map([
      [
        "local1:base:--color::",
        createStyleDecl("local1", "base", "--color", "red"),
      ],
      [
        "local1:base:--color-dark::",
        createStyleDecl("local1", "base", "--color-dark", "darkred"),
      ],
      [
        "local1:base:--color-darker::",
        createStyleDecl("local1", "base", "--color-darker", "maroon"),
      ],
      [
        "local1:base:backgroundColor::",
        createStyleDecl("local1", "base", "backgroundColor", "var(--color)"),
      ],
      [
        "local1:base:color::",
        createStyleDecl("local1", "base", "color", "var(--color-dark)"),
      ],
    ]);

    const { counts } = findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props: new Map(),
    });

    expect(counts.get("--color")).toBe(1);
    expect(counts.get("--color-dark")).toBe(1);
    expect(counts.get("--color-darker")).toBeUndefined();
  });
});
