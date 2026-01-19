import { describe, test, expect } from "vitest";
import type { Instance, StyleDecl } from "@webstudio-is/sdk";
import {
  descendantComponent,
  ROOT_INSTANCE_ID,
  rootComponent,
} from "@webstudio-is/sdk";
import {
  createRegularStyleSheet,
  FakeStyleElement,
} from "@webstudio-is/css-engine";
import { __testing__ } from "./styles";

const {
  getEphemeralProperty,
  getInstanceSelector,
  getPresetStyleSelector,
  computeDescendantSelectors,
  computeInstanceStyles,
  computeEditableCursorRules,
  computeStylesDiff,
  toDeclarationParams,
  renderStateStyles,
} = __testing__;

const createTestSheet = () =>
  createRegularStyleSheet({ element: new FakeStyleElement() });

const mockTransformValue = () => undefined;

// Simple passthrough - just return the style value
const mockToStyleValue = (styleDecl: Pick<StyleDecl, "value">) =>
  styleDecl.value;

const createStyleDecl = (overrides: Partial<StyleDecl> = {}): StyleDecl => ({
  styleSourceId: "style-source-1",
  breakpointId: "base",
  property: "color",
  value: { type: "keyword", value: "red" },
  ...overrides,
});

describe("renderStateStyles", () => {
  test("clears sheet when instanceStyles is undefined", () => {
    const sheet = createTestSheet();
    sheet.addMediaRule("base");
    const rule = sheet.addNestingRule('[data-ws-id="old"]');
    rule.setDeclaration({
      breakpoint: "base",
      selector: "",
      property: "color",
      value: { type: "keyword", value: "blue" },
    });
    renderStateStyles({
      instanceStyles: undefined,
      sheet,
      transformValue: mockTransformValue,
      toStyleValue: mockToStyleValue,
    });
    expect(sheet.cssText).toBe("");
  });

  describe("pseudo-elements keep their selector", () => {
    test("::before styles apply to ::before selector", () => {
      const sheet = createTestSheet();
      renderStateStyles({
        instanceStyles: {
          instanceId: "box",
          selectedState: "::before",
          breakpoints: [{ id: "base", label: "Base" }],
          styles: [
            createStyleDecl({
              property: "content",
              value: { type: "keyword", value: '""' },
            }),
          ],
        },
        sheet,
        transformValue: mockTransformValue,
        toStyleValue: mockToStyleValue,
      });
      expect(sheet.cssText).toContain("::before");
      expect(sheet.cssText).toContain('content: ""');
    });

    test("::after styles apply to ::after selector", () => {
      const sheet = createTestSheet();
      renderStateStyles({
        instanceStyles: {
          instanceId: "box",
          selectedState: "::after",
          breakpoints: [{ id: "base", label: "Base" }],
          styles: [
            createStyleDecl({
              property: "content",
              value: { type: "keyword", value: '""' },
            }),
          ],
        },
        sheet,
        transformValue: mockTransformValue,
        toStyleValue: mockToStyleValue,
      });
      expect(sheet.cssText).toContain("::after");
    });

    test("::placeholder keeps selector", () => {
      const sheet = createTestSheet();
      renderStateStyles({
        instanceStyles: {
          instanceId: "input",
          selectedState: "::placeholder",
          breakpoints: [{ id: "base", label: "Base" }],
          styles: [createStyleDecl()],
        },
        sheet,
        transformValue: mockTransformValue,
        toStyleValue: mockToStyleValue,
      });
      expect(sheet.cssText).toContain("::placeholder");
    });
  });

  describe("pseudo-classes render without state for preview", () => {
    test(":hover styles apply without :hover selector", () => {
      const sheet = createTestSheet();
      renderStateStyles({
        instanceStyles: {
          instanceId: "button",
          selectedState: ":hover",
          breakpoints: [{ id: "base", label: "Base" }],
          styles: [
            createStyleDecl({
              property: "backgroundColor",
              value: { type: "keyword", value: "blue" },
            }),
          ],
        },
        sheet,
        transformValue: mockTransformValue,
        toStyleValue: mockToStyleValue,
      });
      expect(sheet.cssText).not.toContain(":hover");
      expect(sheet.cssText).toContain("background-color: blue");
    });

    test(":focus styles apply without :focus selector", () => {
      const sheet = createTestSheet();
      renderStateStyles({
        instanceStyles: {
          instanceId: "input",
          selectedState: ":focus",
          breakpoints: [{ id: "base", label: "Base" }],
          styles: [createStyleDecl()],
        },
        sheet,
        transformValue: mockTransformValue,
        toStyleValue: mockToStyleValue,
      });
      expect(sheet.cssText).not.toContain(":focus");
    });

    test(":active styles apply without :active selector", () => {
      const sheet = createTestSheet();
      renderStateStyles({
        instanceStyles: {
          instanceId: "button",
          selectedState: ":active",
          breakpoints: [{ id: "base", label: "Base" }],
          styles: [createStyleDecl()],
        },
        sheet,
        transformValue: mockTransformValue,
        toStyleValue: mockToStyleValue,
      });
      expect(sheet.cssText).not.toContain(":active");
    });
  });

  test("creates nesting rule with correct instance selector", () => {
    const sheet = createTestSheet();
    renderStateStyles({
      instanceStyles: {
        instanceId: "my-instance-123",
        selectedState: ":hover",
        breakpoints: [{ id: "base", label: "Base" }],
        styles: [createStyleDecl()],
      },
      sheet,
      transformValue: mockTransformValue,
      toStyleValue: mockToStyleValue,
    });
    expect(sheet.cssText).toContain('[data-ws-id="my-instance-123"]');
  });

  test("renders multiple style declarations", () => {
    const sheet = createTestSheet();
    renderStateStyles({
      instanceStyles: {
        instanceId: "box",
        selectedState: "::before",
        breakpoints: [{ id: "base", label: "Base" }],
        styles: [
          createStyleDecl({
            property: "content",
            value: { type: "keyword", value: '""' },
          }),
          createStyleDecl({
            property: "color",
            value: { type: "keyword", value: "red" },
          }),
          createStyleDecl({
            property: "fontSize",
            value: { type: "unit", unit: "px", value: 16 },
          }),
        ],
      },
      sheet,
      transformValue: mockTransformValue,
      toStyleValue: mockToStyleValue,
    });
    expect(sheet.cssText).toContain('content: ""');
    expect(sheet.cssText).toContain("color: red");
    expect(sheet.cssText).toContain("font-size: 16px");
  });
});

describe("getEphemeralProperty", () => {
  test("generates property name from styleSourceId, state, and property", () => {
    expect(
      getEphemeralProperty({
        styleSourceId: "source-1",
        state: ":hover",
        property: "color",
      })
    ).toBe("--source-1-:hover-color");
  });

  test("handles missing state as empty string", () => {
    expect(
      getEphemeralProperty({
        styleSourceId: "source-1",
        property: "backgroundColor",
      })
    ).toBe("--source-1--backgroundColor");
  });

  test("handles pseudo-element state", () => {
    expect(
      getEphemeralProperty({
        styleSourceId: "abc",
        state: "::before",
        property: "content",
      })
    ).toBe("--abc-::before-content");
  });
});

describe("computeDescendantSelectors", () => {
  const createInstance = (
    id: string,
    component: string,
    children: Instance["children"] = []
  ): Instance => ({
    type: "instance",
    id,
    component,
    children,
  });

  const createProp = (
    id: string,
    instanceId: string,
    name: string,
    value: string
  ) => ({
    id,
    instanceId,
    name,
    type: "string" as const,
    value,
  });

  test("returns empty map when no descendant components", () => {
    const instances = new Map([
      ["box", createInstance("box", "Box", [{ type: "id", value: "text" }])],
      ["text", createInstance("text", "Text")],
    ]);
    const props = new Map();
    expect(computeDescendantSelectors(instances, props)).toEqual(new Map());
  });

  test("computes selector for descendant component with parent and selector prop", () => {
    const instances = new Map([
      [
        "parent",
        createInstance("parent", "Box", [{ type: "id", value: "descendant" }]),
      ],
      ["descendant", createInstance("descendant", descendantComponent)],
    ]);
    const props = new Map([
      ["prop-1", createProp("prop-1", "descendant", "selector", " > div")],
    ]);
    const result = computeDescendantSelectors(instances, props);
    expect(result.get("descendant")).toBe('[data-ws-id="parent"] > div');
  });

  test("ignores descendant without selector prop", () => {
    const instances = new Map([
      [
        "parent",
        createInstance("parent", "Box", [{ type: "id", value: "descendant" }]),
      ],
      ["descendant", createInstance("descendant", descendantComponent)],
    ]);
    const props = new Map();
    const result = computeDescendantSelectors(instances, props);
    expect(result.has("descendant")).toBe(false);
  });

  test("ignores descendant without parent", () => {
    const instances = new Map([
      ["descendant", createInstance("descendant", descendantComponent)],
    ]);
    const props = new Map([
      ["prop-1", createProp("prop-1", "descendant", "selector", " > div")],
    ]);
    const result = computeDescendantSelectors(instances, props);
    expect(result.has("descendant")).toBe(false);
  });

  test("handles multiple descendants", () => {
    const instances = new Map([
      [
        "parent",
        createInstance("parent", "Box", [
          { type: "id", value: "desc1" },
          { type: "id", value: "desc2" },
        ]),
      ],
      ["desc1", createInstance("desc1", descendantComponent)],
      ["desc2", createInstance("desc2", descendantComponent)],
    ]);
    const props = new Map([
      ["p1", createProp("p1", "desc1", "selector", " .item")],
      ["p2", createProp("p2", "desc2", "selector", " a")],
    ]);
    const result = computeDescendantSelectors(instances, props);
    expect(result.get("desc1")).toBe('[data-ws-id="parent"] .item');
    expect(result.get("desc2")).toBe('[data-ws-id="parent"] a');
  });
});

describe("computeInstanceStyles", () => {
  const createInstance = (id: string): Instance => ({
    type: "instance",
    id,
    component: "Box",
    children: [],
  });

  test("returns undefined when selectedInstance is undefined", () => {
    expect(
      computeInstanceStyles({
        selectedInstance: undefined,
        selectedStyleState: ":hover",
        breakpoints: new Map(),
        styleSourceSelections: new Map(),
        styles: new Map(),
      })
    ).toBeUndefined();
  });

  test("returns undefined when selectedStyleState is undefined", () => {
    expect(
      computeInstanceStyles({
        selectedInstance: createInstance("box"),
        selectedStyleState: undefined,
        breakpoints: new Map(),
        styleSourceSelections: new Map(),
        styles: new Map(),
      })
    ).toBeUndefined();
  });

  test("filters styles by selected state and instance style sources", () => {
    const result = computeInstanceStyles({
      selectedInstance: createInstance("box"),
      selectedStyleState: ":hover",
      breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
      styleSourceSelections: new Map([
        ["box", { values: ["local", "token-1"] }],
      ]),
      styles: new Map([
        [
          "key1",
          createStyleDecl({
            styleSourceId: "local",
            breakpointId: "base",
            state: ":hover",
            property: "color",
            value: { type: "keyword", value: "red" },
          }),
        ],
        [
          "key2",
          createStyleDecl({
            styleSourceId: "local",
            breakpointId: "base",
            property: "fontSize",
            value: { type: "unit", unit: "px", value: 16 },
          }),
        ],
        [
          "key3",
          createStyleDecl({
            styleSourceId: "other",
            breakpointId: "base",
            state: ":hover",
            property: "marginTop",
            value: { type: "unit", unit: "px", value: 0 },
          }),
        ],
      ]),
    });
    expect(result).toEqual({
      instanceId: "box",
      selectedState: ":hover",
      breakpoints: [{ id: "base", label: "Base" }],
      styles: [
        {
          styleSourceId: "local",
          breakpointId: "base",
          state: ":hover",
          property: "color",
          value: { type: "keyword", value: "red" },
        },
      ],
    });
  });

  test("includes styles from multiple style sources", () => {
    const result = computeInstanceStyles({
      selectedInstance: createInstance("box"),
      selectedStyleState: "::before",
      breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
      styleSourceSelections: new Map([
        ["box", { values: ["local", "token-1"] }],
      ]),
      styles: new Map([
        [
          "key1",
          createStyleDecl({
            styleSourceId: "local",
            breakpointId: "base",
            state: "::before",
            property: "content",
            value: { type: "keyword", value: '""' },
          }),
        ],
        [
          "key2",
          createStyleDecl({
            styleSourceId: "token-1",
            breakpointId: "base",
            state: "::before",
            property: "color",
            value: { type: "keyword", value: "blue" },
          }),
        ],
      ]),
    });
    expect(result?.styles).toHaveLength(2);
  });
});

describe("computeEditableCursorRules", () => {
  const createInstance = (
    id: string,
    children: Instance["children"] = []
  ): Instance => ({
    id,
    type: "instance",
    component: "Box",
    children,
  });

  test("returns empty array when no selectors", () => {
    const result = computeEditableCursorRules([], new Map());
    expect(result).toEqual([]);
  });

  test("generates cursor rule for editable instances", () => {
    const instances = new Map<string, Instance>([
      ["inst-1", createInstance("inst-1")],
      ["inst-2", createInstance("inst-2")],
    ]);
    const selectors = [["inst-1"], ["inst-2"]] as [string][];
    const result = computeEditableCursorRules(selectors, instances);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('[data-ws-id="inst-1"]');
    expect(result[0]).toContain('[data-ws-id="inst-2"]');
    expect(result[0]).toContain("cursor: text");
  });

  test("excludes instances with expression children", () => {
    const instances = new Map<string, Instance>([
      ["inst-1", createInstance("inst-1")],
      [
        "inst-2",
        createInstance("inst-2", [{ type: "expression", value: "someExpr" }]),
      ],
    ]);
    const selectors = [["inst-1"], ["inst-2"]] as [string][];
    const result = computeEditableCursorRules(selectors, instances);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('[data-ws-id="inst-1"]');
    expect(result[0]).not.toContain('[data-ws-id="inst-2"]');
  });

  test("excludes instances not found in map", () => {
    const instances = new Map<string, Instance>([
      ["inst-1", createInstance("inst-1")],
    ]);
    const selectors = [["inst-1"], ["inst-missing"]] as [string][];
    const result = computeEditableCursorRules(selectors, instances);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('[data-ws-id="inst-1"]');
    expect(result[0]).not.toContain("inst-missing");
  });

  test("chunks selectors into groups of 20", () => {
    const instances = new Map<string, Instance>();
    const selectors: [string][] = [];
    for (let i = 0; i < 25; i++) {
      const id = `inst-${i}`;
      instances.set(id, createInstance(id));
      selectors.push([id]);
    }
    const result = computeEditableCursorRules(selectors, instances);
    expect(result).toHaveLength(2);
  });

  test("skips empty chunks", () => {
    const instances = new Map<string, Instance>();
    // All instances have expression children, so all chunks are empty
    for (let i = 0; i < 5; i++) {
      const id = `inst-${i}`;
      instances.set(
        id,
        createInstance(id, [{ type: "expression", value: "expr" }])
      );
    }
    const selectors = Array.from(instances.keys()).map((id) => [id]) as [
      string,
    ][];
    const result = computeEditableCursorRules(selectors, instances);
    expect(result).toEqual([]);
  });
});

describe("computeStylesDiff", () => {
  const style1 = createStyleDecl({
    styleSourceId: "source-1",
    breakpointId: "base",
    property: "color",
    value: { type: "keyword", value: "red" },
  });
  const style2 = createStyleDecl({
    styleSourceId: "source-2",
    breakpointId: "base",
    property: "display",
    value: { type: "keyword", value: "flex" },
  });
  const mockTransform = () => undefined;

  test("returns all styles as added when prev is empty", () => {
    const styles = new Map([
      ["key1", style1],
      ["key2", style2],
    ]);
    const result = computeStylesDiff({
      styles,
      transformValue: mockTransform,
      prevStylesSet: new Set(),
      prevTransformValue: mockTransform,
    });
    expect(result.addedStyles.size).toBe(2);
    expect(result.deletedStyles.size).toBe(0);
    expect(result.nextPrevStylesSet.size).toBe(2);
  });

  test("returns removed styles as deleted", () => {
    const prevStyles = new Set([style1, style2]);
    const styles = new Map([["key1", style1]]);
    const result = computeStylesDiff({
      styles,
      transformValue: mockTransform,
      prevStylesSet: prevStyles,
      prevTransformValue: mockTransform,
    });
    expect(result.addedStyles.size).toBe(0);
    expect(result.deletedStyles.size).toBe(1);
    expect(result.deletedStyles.has(style2)).toBe(true);
  });

  test("returns new styles as added and removed as deleted", () => {
    const style3 = createStyleDecl({
      styleSourceId: "source-3",
      breakpointId: "base",
      property: "width",
      value: { type: "unit", value: 100, unit: "px" },
    });
    const prevStyles = new Set([style1, style2]);
    const styles = new Map([
      ["key1", style1],
      ["key3", style3],
    ]);
    const result = computeStylesDiff({
      styles,
      transformValue: mockTransform,
      prevStylesSet: prevStyles,
      prevTransformValue: mockTransform,
    });
    expect(result.addedStyles.size).toBe(1);
    expect(result.addedStyles.has(style3)).toBe(true);
    expect(result.deletedStyles.size).toBe(1);
    expect(result.deletedStyles.has(style2)).toBe(true);
  });

  test("invalidates cache when transformValue changes", () => {
    const newTransform = () => undefined;
    const prevStyles = new Set([style1]);
    const styles = new Map([
      ["key1", style1],
      ["key2", style2],
    ]);
    const result = computeStylesDiff({
      styles,
      transformValue: newTransform,
      prevStylesSet: prevStyles,
      prevTransformValue: mockTransform, // different reference
    });
    // All styles are "added" because cache was invalidated
    expect(result.addedStyles.size).toBe(2);
    expect(result.deletedStyles.size).toBe(0);
  });

  test("no changes when styles are identical", () => {
    const prevStyles = new Set([style1, style2]);
    const styles = new Map([
      ["key1", style1],
      ["key2", style2],
    ]);
    const result = computeStylesDiff({
      styles,
      transformValue: mockTransform,
      prevStylesSet: prevStyles,
      prevTransformValue: mockTransform,
    });
    expect(result.addedStyles.size).toBe(0);
    expect(result.deletedStyles.size).toBe(0);
  });
});

describe("toDeclarationParams", () => {
  test("converts StyleDecl to declaration params", () => {
    const styleDecl = createStyleDecl({
      breakpointId: "tablet",
      state: ":hover",
      property: "backgroundColor",
    });
    const result = toDeclarationParams(styleDecl);
    expect(result).toEqual({
      breakpoint: "tablet",
      selector: ":hover",
      property: "backgroundColor",
    });
  });

  test("converts undefined state to empty string", () => {
    const styleDecl = createStyleDecl({
      breakpointId: "base",
      state: undefined,
      property: "color",
    });
    const result = toDeclarationParams(styleDecl);
    expect(result).toEqual({
      breakpoint: "base",
      selector: "",
      property: "color",
    });
  });

  test("handles pseudo-element state", () => {
    const styleDecl = createStyleDecl({
      breakpointId: "base",
      state: "::before",
      property: "content",
    });
    const result = toDeclarationParams(styleDecl);
    expect(result).toEqual({
      breakpoint: "base",
      selector: "::before",
      property: "content",
    });
  });
});

describe("getInstanceSelector", () => {
  test("returns :root for ROOT_INSTANCE_ID", () => {
    expect(getInstanceSelector(ROOT_INSTANCE_ID)).toBe(":root");
  });

  test("returns attribute selector for regular instance ID", () => {
    expect(getInstanceSelector("inst-123")).toBe('[data-ws-id="inst-123"]');
  });

  test("returns attribute selector for empty string", () => {
    expect(getInstanceSelector("")).toBe('[data-ws-id=""]');
  });
});

describe("getPresetStyleSelector", () => {
  test("returns :root for rootComponent", () => {
    expect(getPresetStyleSelector(rootComponent, "div")).toBe(":root");
  });

  test("returns :where selector for regular component", () => {
    expect(getPresetStyleSelector("Box", "div")).toBe(
      'div:where([data-ws-component="Box"])'
    );
  });

  test("uses tag in selector", () => {
    expect(getPresetStyleSelector("Button", "button")).toBe(
      'button:where([data-ws-component="Button"])'
    );
  });

  test("handles custom component names", () => {
    expect(getPresetStyleSelector("MyCustomComponent", "span")).toBe(
      'span:where([data-ws-component="MyCustomComponent"])'
    );
  });
});
