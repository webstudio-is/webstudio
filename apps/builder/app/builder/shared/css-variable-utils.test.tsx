import { test, expect } from "vitest";
import { atom } from "nanostores";
import { $styles } from "~/shared/nano-states";
import {
  findCssVariableUsagesByInstance,
  validateCssVariableName,
  performCssVariableRename,
} from "./css-variable-utils";
import type { StyleDecl, Styles } from "@webstudio-is/sdk";
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

test("validateCssVariableName returns required error for empty name", () => {
  mockStyles.set(new Map());

  const error = validateCssVariableName("");
  expect(error).toEqual({
    type: "required",
    message: "CSS variable name cannot be empty",
  });
});

test("validateCssVariableName returns required error for whitespace-only name", () => {
  mockStyles.set(new Map());

  const error = validateCssVariableName("   ");
  expect(error).toEqual({
    type: "required",
    message: "CSS variable name cannot be empty",
  });
});

test("validateCssVariableName returns invalid error for name without --", () => {
  mockStyles.set(new Map());

  const error = validateCssVariableName("my-color");
  expect(error).toEqual({
    type: "invalid",
    message: 'CSS variable name must start with "--"',
  });
});

test("validateCssVariableName returns undefined for valid unique name", () => {
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

test("validateCssVariableName returns duplicate error for existing name", () => {
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

test("validateCssVariableName allows renaming variable to same name", () => {
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

test("findCssVariableUsagesByInstance does not track definitions", () => {
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
  });

  // Should not track definitions, only var() references
  expect(counts.size).toBe(0);
  expect(instances.size).toBe(0);
});

test("findCssVariableUsagesByInstance tracks var() references", () => {
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
  });

  expect(counts.size).toBe(1);
  expect(counts.get("--primary-color")).toBe(1);
  expect(instances.get("--primary-color")).toEqual(new Set(["box2"]));
});

test("findCssVariableUsagesByInstance tracks only var() references not definitions", () => {
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
  });

  expect(counts.size).toBe(1);
  expect(counts.get("--color")).toBe(2);
  // Only box2 and box3 use var(--color), box1 only defines it
  expect(instances.get("--color")).toEqual(new Set(["box2", "box3"]));
});

test("findCssVariableUsagesByInstance handles multiple variables", () => {
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
  });

  expect(counts.size).toBe(1);
  // --color is only defined, not used
  expect(counts.get("--color")).toBeUndefined();
  // --size is used via var()
  expect(counts.get("--size")).toBe(1);
  expect(instances.get("--size")).toEqual(new Set(["box1"]));
});

test("findCssVariableUsagesByInstance distinguishes between definition and usage", () => {
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
  });

  expect(counts.size).toBe(1);
  expect(counts.get("--theme-color")).toBe(1);
  // Should only track the user, not the definer
  expect(instances.get("--theme-color")).toEqual(new Set(["user"]));
  expect(instances.get("--theme-color")?.has("definer")).toBe(false);
});

test("findCssVariableUsagesByInstance counts multiple references on same instance", () => {
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
  });

  expect(counts.size).toBe(1);
  // Should count all 3 usages, not just 1
  expect(counts.get("--spacing")).toBe(3);
  // But only 1 instance
  expect(instances.get("--spacing")).toEqual(new Set(["box1"]));
});

test("findCssVariableUsagesByInstance handles unparsed values with var()", () => {
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
  // We don't track var() inside unparsed strings since they're not structured
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
  });

  // Unparsed values are treated as opaque strings, so var() references inside
  // are not tracked. This is expected behavior.
  expect(counts.size).toBe(0);
  expect(instances.size).toBe(0);
});

test("performCssVariableRename updates property declarations", () => {
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

  const result = performCssVariableRename(styles, "--my-color", "--new-color");

  expect(result.size).toBe(1);
  const [decl] = Array.from(result.values());
  expect(decl.property).toBe("--new-color");
  expect(decl.value).toEqual({ type: "keyword", value: "red" });
});

test("performCssVariableRename updates var() references", () => {
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

  const result = performCssVariableRename(styles, "--my-color", "--new-color");

  expect(result.size).toBe(2);
  const colorDecl = Array.from(result.values()).find(
    (d) => d.property === "color"
  );
  expect(colorDecl?.value).toEqual({ type: "var", value: "new-color" });
});

test("performCssVariableRename updates nested var() references", () => {
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

test("performCssVariableRename updates array of var() references", () => {
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

test("performCssVariableRename handles multiple declarations of same variable", () => {
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

test("performCssVariableRename does not modify unrelated variables", () => {
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

  const result = performCssVariableRename(styles, "--my-color", "--new-color");

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

test("performCssVariableRename handles values with no references", () => {
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

  const result = performCssVariableRename(styles, "--my-color", "--new-color");

  expect(result.size).toBe(2);
  const fontSizeDecl = Array.from(result.values()).find(
    (d) => d.property === "fontSize"
  );
  // Value should be unchanged
  expect(fontSizeDecl?.value).toEqual({ type: "unit", value: 16, unit: "px" });
});
