import { enableMapSet } from "immer";
import { describe, expect, test } from "vitest";
import {
  type Breakpoint,
  getStyleDeclKey,
  ROOT_INSTANCE_ID,
  type Instance,
  type Prop,
  type StyleDecl,
  type StyleSource,
  type StyleSources,
  type StyleSourceSelection,
  type StyleSourceSelections,
  type Styles,
} from "@webstudio-is/sdk";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-engine";
import {
  collectCssVariableReferences,
  createCssVariableDeletePayload,
  createCssVariableNamesRegex,
  createCssVariableReferenceRewritePayload,
  createCssVariableRootDefinePayload,
  createDesignTokenCreatePayload,
  createDesignTokenExtractionPayload,
  createDesignTokenStyleDeletePayload,
  createDesignTokenStyleInputs,
  createDesignTokenStyleUpdatePayload,
  createStyleDeclarationDeletePayload,
  createStyleDeclarationUpdatePayload,
  createStyleSourceSelectionAddPatch,
  createStyleSourceSelectionAddPlan,
  createStyleSourceSelectionAttachPayload,
  createStyleSourceSelectionDetachPayload,
  createStyleSourceSelectionRemovePatch,
  createStyleSourceSelectionRemovePlan,
  createStyleValueReplacementPayload,
  createTokenStyleSource,
  cssVariableValueInput,
  designTokenCreateInput,
  createAttachedDesignTokens,
  createDesignTokens,
  findDesignToken,
  findCssVariableUsagesByInstance,
  getDefinedCssVariableNames,
  getCssVariableDefinitionsByVariable,
  getInstanceIdByStyleSourceId,
  getReferencedCssVariables,
  getStyleSourceInsertionIndex,
  getStyleDeclarations,
  getUnusedCssVariableNames,
  performCssVariableRename,
  renameCssVariable,
  serializeCssVariables,
  createSelectedStyleDeclarationDeletePayload,
  createSelectedStyleDeclarationUpdatePayload,
  styleDeleteInput,
  styleReplaceInput,
  styleUpdateInput,
  defineCssVariables,
  deleteDesignTokenStyles,
  deleteSelectedStyleDeclarations,
  deleteStyleSources,
  deleteStyleDeclarations,
  clearStyleSourceStyles,
  convertLocalStyleSourceToToken,
  duplicateStyleSource,
  renameStyleSource,
  reorderStyleSources,
  setStyleSourceLock,
  updateDesignTokenStyles,
  updateSelectedStyleDeclarations,
  updateStyleDeclarations,
  validateCssVariableNameWithStyles,
  validateStyleSourceName,
  updateVarReferencesInProps,
} from "./styles";
import { createLocalStyleSourceClonePlan } from "./style-utils";
import {
  addStyleSourceToInstanceMutable,
  createLocalStyleSourcePatchPlan,
  createLocalStyleSourcePlan,
  createStyleDecl as createStyleDeclValue,
  createStyleDeclFromInput,
  deleteLocalStyleSourcesMutable,
  deleteStyleDeclMutable,
  deleteStyleSourceMutable,
  deleteStyleSourcesMutable,
  findDuplicateTokens,
  findUnusedTokens,
  getStyleSourceUsages,
  getLocalStyleSourceId,
  getLocalStyleSourceIdWithCreated,
  getOrCreateLocalStyleSourceIdMutable,
  getStyleDeclKeyFromInput,
  isStyleSourceLocked,
  removeStyleSourceFromInstanceMutable,
  renameStyleSourceMutable,
  serializeDesignTokens,
  setStyleDeclMutable,
  toggleStyleSourceLockMutable,
  updateStyleDecl,
  validateAndRenameStyleSource,
} from "./styles";

test("rejects client-supplied design token ids", () => {
  expect(
    designTokenCreateInput.safeParse({
      tokenId: "client-token-id",
      name: "Primary",
    }).success
  ).toBe(false);
});

const localStyleSource: StyleSource = {
  type: "local",
  id: "local-style-source",
};
const displayStyle: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local-style-source",
  property: "display",
  value: { type: "keyword", value: "flex" },
};
const displayStyleKey = getStyleDeclKey(displayStyle);

describe("selected style declaration payloads", () => {
  test("normalizes CSS property names in selected style declarations", () => {
    const fontSizeStyle: StyleDecl = {
      breakpointId: "base",
      styleSourceId: localStyleSource.id,
      property: "fontSize",
      value: { type: "unit", value: 24, unit: "px" },
    };
    const fontSizeStyleKey = getStyleDeclKey(fontSizeStyle);

    expect(
      createSelectedStyleDeclarationUpdatePayload({
        updates: [
          {
            instanceId: "box",
            styleSource: localStyleSource,
            styleSourceId: localStyleSource.id,
            property: "font-size",
            value: { type: "unit", value: 24, unit: "px" },
          },
        ],
        styleSources: new Map([[localStyleSource.id, localStyleSource]]),
        styleSourceSelections: [],
        styles: [],
      })
    ).toMatchObject({
      styleKeys: [fontSizeStyleKey],
      payload: expect.arrayContaining([
        {
          namespace: "styles",
          patches: [
            {
              op: "add",
              path: [fontSizeStyleKey],
              value: fontSizeStyle,
            },
          ],
        },
      ]),
    });
  });

  test("creates selected style source, selection, and declaration patches", () => {
    expect(
      createSelectedStyleDeclarationUpdatePayload({
        updates: [
          {
            instanceId: "box",
            styleSource: localStyleSource,
            styleSourceId: localStyleSource.id,
            breakpoint: "base",
            property: "display",
            value: { type: "keyword", value: "flex" },
            listed: true,
          },
        ],
        styleSources: new Map(),
        styleSourceSelections: [],
        styles: [],
      })
    ).toEqual({
      styleKeys: [displayStyleKey],
      payload: [
        {
          namespace: "styleSources",
          patches: [
            {
              op: "add",
              path: ["local-style-source"],
              value: localStyleSource,
            },
          ],
        },
        {
          namespace: "styleSourceSelections",
          patches: [
            {
              op: "add",
              path: ["box"],
              value: { instanceId: "box", values: ["local-style-source"] },
            },
          ],
        },
        {
          namespace: "styles",
          patches: [
            {
              op: "add",
              path: [displayStyleKey],
              value: {
                ...displayStyle,
                listed: true,
              },
            },
          ],
        },
      ],
    });
  });

  test("creates selected declaration delete payload", () => {
    const selection: StyleSourceSelection = {
      instanceId: "box",
      values: ["local-style-source"],
    };

    expect(
      createSelectedStyleDeclarationDeletePayload({
        deletions: [
          {
            styleSourceId: localStyleSource.id,
            breakpoint: "base",
            property: "display",
          },
        ],
        styles: [displayStyle],
      })
    ).toEqual({
      styleKeys: [displayStyleKey],
      payload: [
        {
          namespace: "styles",
          patches: [{ op: "remove", path: [displayStyleKey] }],
        },
      ],
    });
    expect(selection.values).toEqual(["local-style-source"]);
  });
});

describe("local style declaration payloads", () => {
  test("preserves listed flag", () => {
    expect(
      createStyleDeclarationUpdatePayload({
        updates: [
          {
            instanceId: "box",
            breakpoint: "base",
            property: "display",
            value: { type: "keyword", value: "flex" },
            listed: true,
          },
        ],
        styleSources: new Map(),
        styleSourceSelections: [],
        styles: [],
        createId: () => "local-style-source",
      }).payload
    ).toEqual([
      {
        namespace: "styleSources",
        patches: [
          {
            op: "add",
            path: ["local-style-source"],
            value: localStyleSource,
          },
        ],
      },
      {
        namespace: "styleSourceSelections",
        patches: [
          {
            op: "add",
            path: ["box"],
            value: { instanceId: "box", values: ["local-style-source"] },
          },
        ],
      },
      {
        namespace: "styles",
        patches: [
          {
            op: "add",
            path: [displayStyleKey],
            value: { ...displayStyle, listed: true },
          },
        ],
      },
    ]);
  });

  test("coalesces duplicate updates for a new declaration", () => {
    expect(
      createStyleDeclarationUpdatePayload({
        updates: [
          {
            instanceId: "box",
            breakpoint: "base",
            property: "display",
            value: { type: "keyword", value: "block" },
          },
          {
            instanceId: "box",
            breakpoint: "base",
            property: "display",
            value: { type: "keyword", value: "grid" },
          },
        ],
        styleSources: new Map(),
        styleSourceSelections: [],
        styles: [],
        createId: () => "local-style-source",
      })
    ).toEqual({
      styleKeys: [displayStyleKey],
      missingLocalStyleSourceInstanceIds: [],
      payload: [
        {
          namespace: "styleSources",
          patches: [
            {
              op: "add",
              path: ["local-style-source"],
              value: localStyleSource,
            },
          ],
        },
        {
          namespace: "styleSourceSelections",
          patches: [
            {
              op: "add",
              path: ["box"],
              value: { instanceId: "box", values: ["local-style-source"] },
            },
          ],
        },
        {
          namespace: "styles",
          patches: [
            {
              op: "add",
              path: [displayStyleKey],
              value: {
                ...displayStyle,
                value: { type: "keyword", value: "grid" },
              },
            },
          ],
        },
      ],
    });
  });

  test("coalesces duplicate updates for an existing declaration", () => {
    expect(
      createStyleDeclarationUpdatePayload({
        updates: [
          {
            instanceId: "box",
            breakpoint: "base",
            property: "display",
            value: { type: "keyword", value: "block" },
          },
          {
            instanceId: "box",
            breakpoint: "base",
            property: "display",
            value: { type: "keyword", value: "grid" },
          },
        ],
        styleSources: new Map([[localStyleSource.id, localStyleSource]]),
        styleSourceSelections: [
          { instanceId: "box", values: [localStyleSource.id] },
        ],
        styles: [displayStyle],
        createId: () => "unused",
      })
    ).toEqual({
      styleKeys: [displayStyleKey],
      missingLocalStyleSourceInstanceIds: [],
      payload: [
        {
          namespace: "styles",
          patches: [
            {
              op: "replace",
              path: [displayStyleKey],
              value: {
                ...displayStyle,
                value: { type: "keyword", value: "grid" },
              },
            },
          ],
        },
      ],
    });
  });
});
const createCssVariableStyleDecl = (
  styleSourceId: string,
  property: string,
  value: string
): StyleDecl => ({
  styleSourceId,
  breakpointId: "base",
  property: property as StyleProperty,
  value: { type: "unparsed", value },
});

const createCssVariableId = () => "new-local";

describe("css variable usage", () => {
  test("parses css variable values used by the API", () => {
    expect(cssVariableValueInput.parse("10px")).toBe("10px");
    expect(
      cssVariableValueInput.parse({ type: "keyword", value: "red" })
    ).toEqual({
      type: "keyword",
      value: "red",
    });
  });

  test("finds defined css variable names", () => {
    expect(
      getDefinedCssVariableNames([
        createCssVariableStyleDecl("local", "--color", "red"),
        createCssVariableStyleDecl("local", "color", "var(--color)"),
      ])
    ).toEqual(new Set(["--color"]));
  });

  test("maps style sources to owning instances", () => {
    expect(
      getInstanceIdByStyleSourceId([
        { instanceId: "box", values: ["token", "local"] },
      ])
    ).toEqual(
      new Map([
        ["token", "box"],
        ["local", "box"],
      ])
    );
  });

  test("finds css variable usage counts and owning instances", () => {
    const styles = [
      createCssVariableStyleDecl("local-1", "--color", "red"),
      createCssVariableStyleDecl("local-2", "color", "var(--color)"),
    ];
    const props = [
      {
        id: "prop",
        instanceId: "embed",
        name: "code",
        type: "string",
        value: "var(--color)",
      },
    ] as const;

    expect(
      findCssVariableUsagesByInstance({
        styleSourceSelections: [
          { instanceId: "box", values: ["local-1"] },
          { instanceId: "text", values: ["local-2"] },
        ],
        styles,
        props,
      })
    ).toEqual({
      counts: new Map([["--color", 2]]),
      instances: new Map([["--color", new Set(["text", "embed"])]]),
    });
  });

  test("collects css variable references in edge-case strings", () => {
    const regex = createCssVariableNamesRegex(
      new Set([
        "--color",
        "--color-dark",
        "--spacing",
        "--opacity",
        "--special-$name",
      ])
    );

    expect(
      collectCssVariableReferences(
        "var(--color) var(--color-dark) var(--color-darker)",
        regex
      )
    ).toEqual(new Set(["--color", "--color-dark"]));
    expect(
      collectCssVariableReferences(
        "calc(100%-var(--spacing)) linear-gradient(red var(--opacity)%)",
        regex
      )
    ).toEqual(new Set(["--spacing", "--opacity"]));
    expect(collectCssVariableReferences("var(--special-$name)", regex)).toEqual(
      new Set(["--special-$name"])
    );
  });

  test("finds css variable definitions and references", () => {
    const styles = [
      createCssVariableStyleDecl("local-1", "--color", "red"),
      createCssVariableStyleDecl("local-2", "color", "var(--color)"),
    ];
    const props = [
      {
        id: "prop",
        instanceId: "embed",
        name: "code",
        type: "string",
        value: "var(--color)",
      },
    ] as const;

    expect(
      getCssVariableDefinitionsByVariable({
        styleSourceSelections: [
          { instanceId: "box", values: ["local-1"] },
          { instanceId: "text", values: ["local-2"] },
        ],
        styles,
      })
    ).toEqual(new Map([["--color", new Set(["box"])]]));
    expect(getReferencedCssVariables({ styles, props })).toEqual(
      new Set(["--color"])
    );
  });

  test("renames css variables in style definitions, nested values, and embed props", () => {
    const styles = new Map<string, StyleDecl>([
      [
        "local:base:--spacing:",
        createCssVariableStyleDecl("local", "--spacing", "10px"),
      ],
      [
        "local:base:padding:",
        {
          ...createCssVariableStyleDecl("local", "padding", "unused"),
          value: { type: "var", value: "spacing" },
        },
      ],
      [
        "local:base:filter:",
        {
          ...createCssVariableStyleDecl("local", "filter", "unused"),
          value: {
            type: "layers",
            value: [
              {
                type: "function",
                name: "drop-shadow",
                args: {
                  type: "tuple",
                  value: [
                    { type: "unit", value: 0, unit: "px" },
                    { type: "var", value: "spacing" },
                  ],
                },
              },
            ],
          } as StyleValue,
        },
      ],
      [
        "local:base:width:",
        createCssVariableStyleDecl(
          "local",
          "width",
          "calc(100% - var(--spacing))"
        ),
      ],
    ]);
    const props = new Map<string, Prop>([
      [
        "embed-code",
        {
          id: "embed-code",
          instanceId: "embed",
          name: "code",
          type: "string",
          value: ".x{padding:var(--spacing);margin:var(--spacing, 1rem)}",
        },
      ],
    ]);

    const renamedStyles = performCssVariableRename(
      styles,
      "--spacing",
      "--space"
    );
    const renamedProps = updateVarReferencesInProps(
      props,
      "--spacing",
      "--space"
    );

    expect(renamedStyles.has("local:base:--space:")).toBe(true);
    expect(renamedStyles.get("local:base:padding:")?.value).toEqual({
      type: "var",
      value: "space",
    });
    expect(renamedStyles.get("local:base:width:")?.value).toEqual({
      type: "unparsed",
      value: "calc(100% - var(--space))",
    });
    expect(
      JSON.stringify(renamedStyles.get("local:base:filter:")?.value)
    ).toContain('"value":"space"');
    expect(renamedProps.get("embed-code")?.value).toBe(
      ".x{padding:var(--space);margin:var(--space, 1rem)}"
    );
  });

  test("finds unused css variables from definitions and references", () => {
    expect(
      getUnusedCssVariableNames({
        definitionsByVariable: new Map([
          ["--used", new Set(["box"])],
          ["--unused", new Set(["box"])],
        ]),
        referencedVariables: new Set(["--used"]),
      })
    ).toEqual(new Set(["--unused"]));
  });

  test("validates css variable names", () => {
    expect(
      validateCssVariableNameWithStyles({
        name: "",
        styles: [],
      })
    ).toEqual({
      type: "required",
      message: "CSS variable name cannot be empty",
    });
    expect(
      validateCssVariableNameWithStyles({
        name: "color",
        styles: [],
      })
    ).toEqual({
      type: "invalid",
      message: 'CSS variable name must start with "--"',
    });
    expect(
      validateCssVariableNameWithStyles({
        name: "--color",
        styles: [createCssVariableStyleDecl("local", "--color", "red")],
      })
    ).toEqual({
      type: "duplicate",
      message: 'CSS variable "--color" already exists',
    });
    expect(
      validateCssVariableNameWithStyles({
        name: "--color",
        currentProperty: "--color",
        styles: [createCssVariableStyleDecl("local", "--color", "red")],
      })
    ).toBeUndefined();
  });

  test("serializes css variables with scope and usage", () => {
    expect(
      serializeCssVariables({
        styles: [
          createCssVariableStyleDecl("local", "--color", "red"),
          createCssVariableStyleDecl("local", "color", "var(--color)"),
        ],
        props: [
          {
            id: "prop",
            instanceId: "box",
            name: "code",
            type: "string",
            value: "var(--color)",
          },
        ],
        styleSourceSelections: [{ instanceId: "box", values: ["local"] }],
        withUsage: true,
      })
    ).toEqual({
      vars: [
        {
          name: "--color",
          value: "red",
          scope: "box",
          usageCount: 2,
        },
      ],
    });
  });

  test("creates root css variable define payload with local style source", () => {
    const result = createCssVariableRootDefinePayload({
      rootInstanceId: "body",
      vars: { "--color": "red" },
      styleSources: new Map(),
      styleSourceSelections: [],
      styles: [],
      createId: createCssVariableId,
    });

    const localStyleSourceId = result.styleKeys[0]?.split(":")[0];
    expect(localStyleSourceId).toEqual(expect.any(String));
    expect(result).toEqual({
      payload: [
        {
          namespace: "styleSources",
          patches: [
            {
              op: "add",
              path: [localStyleSourceId],
              value: { type: "local", id: localStyleSourceId },
            },
          ],
        },
        {
          namespace: "styleSourceSelections",
          patches: [
            {
              op: "add",
              path: ["body"],
              value: { instanceId: "body", values: [localStyleSourceId] },
            },
          ],
        },
        {
          namespace: "styles",
          patches: [
            {
              op: "add",
              path: [`${localStyleSourceId}:base:--color:`],
              value: {
                styleSourceId: localStyleSourceId,
                breakpointId: "base",
                property: "--color",
                value: { type: "unparsed", value: "red" },
              },
            },
          ],
        },
      ],
      names: ["--color"],
      conflicts: [],
      styleKeys: [`${localStyleSourceId}:base:--color:`],
      missingRootStyleSource: false,
    });
  });

  test("reports css variable define conflicts and overwrites when requested", () => {
    const existing = createCssVariableStyleDecl("local", "--color", "red");
    expect(
      createCssVariableRootDefinePayload({
        rootInstanceId: "body",
        vars: { "--color": "blue" },
        styleSources: new Map([["local", { id: "local", type: "local" }]]),
        styleSourceSelections: [{ instanceId: "body", values: ["local"] }],
        styles: [existing],
        createId: createCssVariableId,
      }).conflicts
    ).toEqual(["--color"]);

    expect(
      createCssVariableRootDefinePayload({
        rootInstanceId: "body",
        vars: { "--color": "blue" },
        styleSources: new Map([["local", { id: "local", type: "local" }]]),
        styleSourceSelections: [{ instanceId: "body", values: ["local"] }],
        styles: [existing],
        overwrite: true,
        createId: createCssVariableId,
      }).payload
    ).toEqual([
      {
        namespace: "styles",
        patches: [
          {
            op: "replace",
            path: ["local:base:--color:"],
            value: {
              ...existing,
              value: { type: "unparsed", value: "blue" },
            },
          },
        ],
      },
    ]);
  });

  test("creates css variable delete patches and reports references", () => {
    const styles = [
      createCssVariableStyleDecl("local", "--color", "red"),
      createCssVariableStyleDecl("local", "color", "var(--color)"),
    ];
    expect(
      createCssVariableDeletePayload({
        names: ["--color"],
        styles,
        props: [],
      })
    ).toEqual({
      payload: [],
      styleKeys: [],
      referenced: ["--color"],
    });

    expect(
      createCssVariableDeletePayload({
        names: ["--color"],
        styles,
        props: [],
        force: true,
      })
    ).toEqual({
      payload: [
        {
          namespace: "styles",
          patches: [{ op: "remove", path: ["local:base:--color:"] }],
        },
      ],
      styleKeys: ["local:base:--color:"],
      referenced: [],
    });
  });

  test("creates css variable delete patches from style iterators", () => {
    const styles = new Map([
      [
        "local:base:--color:",
        createCssVariableStyleDecl("local", "--color", "red"),
      ],
    ]);

    expect(
      createCssVariableDeletePayload({
        names: ["--color"],
        styles: styles.values(),
        props: [],
      })
    ).toEqual({
      payload: [
        {
          namespace: "styles",
          patches: [{ op: "remove", path: ["local:base:--color:"] }],
        },
      ],
      styleKeys: ["local:base:--color:"],
      referenced: [],
    });
  });

  test("creates scoped css variable reference rewrite patches", () => {
    expect(
      createCssVariableReferenceRewritePayload({
        replacements: { "--old": "--new" },
        scopeRegex: /^box$/,
        styles: [
          createCssVariableStyleDecl("local", "color", "var(--old)"),
          createCssVariableStyleDecl("other-local", "color", "var(--old)"),
        ],
        props: [
          {
            id: "prop",
            instanceId: "box",
            name: "code",
            type: "string",
            value: "var(--old)",
          },
        ],
        styleSourceSelections: [
          { instanceId: "box", values: ["local"] },
          { instanceId: "other", values: ["other-local"] },
        ],
      })
    ).toEqual({
      payload: [
        {
          namespace: "styles",
          patches: [
            {
              op: "replace",
              path: ["local:base:color:"],
              value: createCssVariableStyleDecl("local", "color", "var(--new)"),
            },
          ],
        },
        {
          namespace: "props",
          patches: [
            {
              op: "replace",
              path: ["prop"],
              value: {
                id: "prop",
                instanceId: "box",
                name: "code",
                type: "string",
                value: "var(--new)",
              },
            },
          ],
        },
      ],
      styleKeys: ["local:base:color:"],
      propIds: ["prop"],
    });
  });
});
enableMapSet();

const getIdValuePair = <T extends { id: string }>(item: T) =>
  [item.id, item] as const;

const toMap = <T extends { id: string }>(list: T[]) =>
  new Map(list.map(getIdValuePair));

const createStyleDecl = (
  styleSourceId: string,
  breakpointId: string,
  property: StyleProperty,
  value: StyleValue | string
): StyleDecl => ({
  styleSourceId,
  breakpointId,
  property,
  value: typeof value === "string" ? { type: "unparsed", value } : value,
});

const createStyleDeclMap = (styles: StyleDecl[]) =>
  new Map(
    styles.map((style) => [
      `${style.styleSourceId}:${style.breakpointId}:${style.property}:${style.state ?? ""}`,
      style,
    ])
  );

const createId = () => "new-id";

const baseBreakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
const runtimeBreakpoints = toMap<Breakpoint>([
  { id: "desktop", label: "Base" },
  { id: "mobile", label: "Mobile", maxWidth: 767 },
]);
const token = (
  id: string,
  name = "Token",
  rest: Partial<Extract<StyleSource, { type: "token" }>> = {}
): Extract<StyleSource, { type: "token" }> => ({
  type: "token",
  id,
  name,
  ...rest,
});
const local = (id: string): Extract<StyleSource, { type: "local" }> => ({
  type: "local",
  id,
});

const sources = (items: StyleSource[]) => toMap<StyleSource>(items);

const instance = (id: string): Instance => ({
  type: "instance",
  id,
  component: "ws:element",
  children: [],
});

describe("runtime style operations", () => {
  test("update styles uses the project base breakpoint when omitted", () => {
    const mutation = updateStyleDeclarations(
      {
        breakpoints: runtimeBreakpoints,
        instances: toMap([instance("box")]),
        styles: new Map(),
        styleSources: sources([local("local")]),
        styleSourceSelections: new Map([
          ["box", { instanceId: "box", values: ["local"] }],
        ]),
      },
      {
        updates: [
          {
            instanceId: "box",
            property: "font-size",
            value: { type: "unit", value: 24, unit: "px" },
          },
        ],
      },
      { createId }
    );

    expect(mutation.result.styleKeys).toEqual(["local:desktop:fontSize:"]);
  });

  test("delete styles uses the project base breakpoint when omitted", () => {
    const mutation = deleteStyleDeclarations(
      {
        breakpoints: runtimeBreakpoints,
        instances: toMap([instance("box")]),
        styles: createStyleDeclMap([
          createStyleDecl("local", "desktop", "fontSize", {
            type: "unit",
            value: 24,
            unit: "px",
          }),
        ]),
        styleSources: sources([local("local")]),
        styleSourceSelections: new Map([
          ["box", { instanceId: "box", values: ["local"] }],
        ]),
      },
      { deletions: [{ instanceId: "box", property: "font-size" }] }
    );

    expect(mutation.result.styleKeys).toEqual(["local:desktop:fontSize:"]);
  });

  test("design token styles use the project base breakpoint when omitted", () => {
    const createMutation = createDesignTokens(
      {
        breakpoints: runtimeBreakpoints,
        styles: new Map(),
        styleSources: new Map(),
        styleSourceSelections: new Map(),
      },
      {
        tokens: [
          {
            name: "Primary",
            styles: { color: { type: "keyword", value: "red" } },
          },
        ],
      },
      { createId }
    );
    expect(createMutation.payload).toContainEqual({
      namespace: "styles",
      patches: [
        {
          op: "add",
          path: ["new-id:desktop:color:"],
          value: createStyleDecl("new-id", "desktop", "color", {
            type: "keyword",
            value: "red",
          }),
        },
      ],
    });

    const updateMutation = updateDesignTokenStyles(
      {
        breakpoints: runtimeBreakpoints,
        styles: new Map(),
        styleSources: sources([token("token", "Primary")]),
        styleSourceSelections: new Map(),
      },
      {
        designTokenId: "token",
        updates: [
          {
            property: "font-size",
            value: { type: "unit", value: 16, unit: "px" },
          },
        ],
      }
    );
    expect(updateMutation.result.styleKeys).toEqual([
      "token:desktop:fontSize:",
    ]);

    const deleteMutation = deleteDesignTokenStyles(
      {
        breakpoints: runtimeBreakpoints,
        styles: createStyleDeclMap([
          createStyleDecl("token", "desktop", "fontSize", {
            type: "unit",
            value: 16,
            unit: "px",
          }),
        ]),
        styleSources: sources([token("token", "Primary")]),
        styleSourceSelections: new Map(),
      },
      { designTokenId: "token", deletions: [{ property: "font-size" }] }
    );
    expect(deleteMutation.result.styleKeys).toEqual([
      "token:desktop:fontSize:",
    ]);
  });

  test("creates and attaches design tokens atomically", () => {
    const mutation = createAttachedDesignTokens(
      {
        breakpoints: runtimeBreakpoints,
        instances: toMap([instance("box")]),
        styles: new Map(),
        styleSources: sources([local("local")]),
        styleSourceSelections: new Map([
          ["box", { instanceId: "box", values: ["local"] }],
        ]),
      },
      {
        tokens: [{ name: "Primary" }],
        instanceIds: ["box"],
      },
      { createId }
    );

    expect(mutation.result).toEqual({ tokenIds: ["new-id"] });
    expect(mutation.payload).toEqual([
      {
        namespace: "styleSources",
        patches: [
          {
            op: "add",
            path: ["new-id"],
            value: { type: "token", id: "new-id", name: "Primary" },
          },
        ],
      },
      {
        namespace: "styleSourceSelections",
        patches: [{ op: "add", path: ["box", "values", 0], value: "new-id" }],
      },
    ]);
  });

  test("creates and attaches design tokens to the virtual root instance", () => {
    const mutation = createAttachedDesignTokens(
      {
        breakpoints: runtimeBreakpoints,
        // The global root is virtual and is intentionally not persisted here.
        instances: new Map(),
        styles: new Map(),
        styleSources: sources([local("local")]),
        styleSourceSelections: new Map(),
      },
      {
        tokens: [{ name: "Primary" }],
        instanceIds: [ROOT_INSTANCE_ID],
      },
      { createId }
    );

    expect(mutation.result).toEqual({ tokenIds: ["new-id"] });
    expect(mutation.payload).toContainEqual({
      namespace: "styleSourceSelections",
      patches: [
        {
          op: "add",
          path: [ROOT_INSTANCE_ID],
          value: { instanceId: ROOT_INSTANCE_ID, values: ["new-id"] },
        },
      ],
    });
  });

  test("selected style source declarations use the project base breakpoint when omitted", () => {
    const instances = toMap([instance("box")]);
    const styleSources = sources([token("token", "Primary")]);
    const styleSourceSelections = new Map([
      ["box", { instanceId: "box", values: ["token"] }],
    ]);

    const updateMutation = updateSelectedStyleDeclarations(
      {
        breakpoints: runtimeBreakpoints,
        instances,
        styles: new Map(),
        styleSources,
        styleSourceSelections,
      },
      {
        updates: [
          {
            instanceId: "box",
            styleSourceId: "token",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
        ],
      }
    );

    expect(updateMutation.result.styleKeys).toEqual(["token:desktop:color:"]);
    expect(updateMutation.payload).toContainEqual({
      namespace: "styles",
      patches: [
        {
          op: "add",
          path: ["token:desktop:color:"],
          value: createStyleDecl("token", "desktop", "color", {
            type: "keyword",
            value: "red",
          }),
        },
      ],
    });

    const deleteMutation = deleteSelectedStyleDeclarations(
      {
        breakpoints: runtimeBreakpoints,
        instances,
        styles: createStyleDeclMap([
          createStyleDecl("token", "desktop", "color", {
            type: "keyword",
            value: "red",
          }),
        ]),
        styleSources,
        styleSourceSelections,
      },
      {
        deletions: [
          {
            instanceId: "box",
            styleSourceId: "token",
            property: "color",
          },
        ],
      }
    );

    expect(deleteMutation.result.styleKeys).toEqual(["token:desktop:color:"]);
    expect(deleteMutation.payload).toEqual([
      {
        namespace: "styles",
        patches: [{ op: "remove", path: ["token:desktop:color:"] }],
      },
    ]);
  });

  test("renames, locks, and deletes style sources", () => {
    const styleSources = sources([token("token", "Primary")]);

    const renameMutation = renameStyleSource(
      { styleSources },
      { styleSourceId: "token", name: "Brand" }
    );

    expect(renameMutation.payload).toEqual([
      {
        namespace: "styleSources",
        patches: [
          {
            op: "replace",
            path: ["token"],
            value: token("token", "Brand"),
          },
        ],
      },
    ]);

    const lockMutation = setStyleSourceLock(
      { styleSources },
      { styleSourceId: "token", locked: true }
    );

    expect(lockMutation.payload).toEqual([
      {
        namespace: "styleSources",
        patches: [
          {
            op: "replace",
            path: ["token"],
            value: token("token", "Primary", { locked: true }),
          },
        ],
      },
    ]);

    const deleteMutation = deleteStyleSources(
      {
        styles: createStyleDeclMap([
          createStyleDecl("token", "desktop", "color", {
            type: "keyword",
            value: "red",
          }),
          createStyleDecl("local", "desktop", "color", {
            type: "keyword",
            value: "blue",
          }),
        ]),
        styleSources: sources([token("token", "Primary"), local("local")]),
        styleSourceSelections: new Map([
          ["box", { instanceId: "box", values: ["token", "local"] }],
        ]),
      },
      { styleSourceIds: ["token"] }
    );

    expect(deleteMutation.payload).toEqual([
      {
        namespace: "styleSources",
        patches: [{ op: "remove", path: ["token"] }],
      },
      {
        namespace: "styleSourceSelections",
        patches: [{ op: "remove", path: ["box", "values", 0] }],
      },
      {
        namespace: "styles",
        patches: [{ op: "remove", path: ["token:desktop:color:"] }],
      },
    ]);
  });

  test("duplicates, converts, reorders, and clears style sources", () => {
    const instances = toMap([instance("box")]);
    const duplicateMutation = duplicateStyleSource(
      {
        instances,
        styles: createStyleDeclMap([
          createStyleDecl("token", "desktop", "color", {
            type: "keyword",
            value: "red",
          }),
        ]),
        styleSources: sources([token("token", "Primary"), local("local")]),
        styleSourceSelections: new Map([
          ["box", { instanceId: "box", values: ["token", "local"] }],
        ]),
      },
      { instanceId: "box", styleSourceId: "token" },
      { createId }
    );

    expect(duplicateMutation.result.styleSourceId).toEqual("new-id");
    expect(duplicateMutation.payload).toEqual([
      {
        namespace: "styleSources",
        patches: [
          {
            op: "add",
            path: ["new-id"],
            value: token("new-id", "Primary (copy)"),
          },
        ],
      },
      {
        namespace: "styleSourceSelections",
        patches: [
          {
            op: "add",
            path: ["box", "values", 1],
            value: "new-id",
          },
        ],
      },
      {
        namespace: "styles",
        patches: [
          {
            op: "add",
            path: ["new-id:desktop:color:"],
            value: createStyleDecl("new-id", "desktop", "color", {
              type: "keyword",
              value: "red",
            }),
          },
        ],
      },
    ]);

    expect(() =>
      duplicateStyleSource(
        {
          instances,
          styles: createStyleDeclMap([]),
          styleSources: sources([local("local")]),
          styleSourceSelections: new Map([
            ["box", { instanceId: "box", values: ["local"] }],
          ]),
        },
        { instanceId: "box", styleSourceId: "local" },
        { createId }
      )
    ).toThrow(
      "Local style sources cannot be duplicated. Convert the local style source to a design token first."
    );

    const convertMutation = convertLocalStyleSourceToToken(
      {
        instances,
        styleSources: new Map(),
        styleSourceSelections: new Map(),
      },
      { instanceId: "box", styleSourceId: "placeholder", name: "Local Copy" },
      { createId }
    );

    expect(convertMutation.result.styleSourceId).toEqual("new-id");
    expect(convertMutation.payload).toEqual([
      {
        namespace: "styleSources",
        patches: [
          {
            op: "add",
            path: ["new-id"],
            value: token("new-id", "Local Copy"),
          },
        ],
      },
      {
        namespace: "styleSourceSelections",
        patches: [
          {
            op: "add",
            path: ["box"],
            value: { instanceId: "box", values: ["new-id"] },
          },
        ],
      },
    ]);

    const reorderMutation = reorderStyleSources(
      {
        instances,
        styleSources: sources([token("token", "Primary"), local("local")]),
        styleSourceSelections: new Map([
          ["box", { instanceId: "box", values: ["token", "local"] }],
        ]),
      },
      { instanceId: "box", styleSourceIds: ["local", "token"] }
    );

    expect(reorderMutation.payload).toEqual([
      {
        namespace: "styleSourceSelections",
        patches: [
          {
            op: "replace",
            path: ["box", "values"],
            value: ["local", "token"],
          },
        ],
      },
    ]);

    const clearMutation = clearStyleSourceStyles(
      {
        styles: createStyleDeclMap([
          createStyleDecl("token", "desktop", "color", {
            type: "keyword",
            value: "red",
          }),
          createStyleDecl("local", "desktop", "color", {
            type: "keyword",
            value: "blue",
          }),
        ]),
        styleSources: sources([token("token", "Primary"), local("local")]),
      },
      { styleSourceId: "token" }
    );

    expect(clearMutation.payload).toEqual([
      {
        namespace: "styles",
        patches: [{ op: "remove", path: ["token:desktop:color:"] }],
      },
    ]);
  });

  test("define css variables uses the project base breakpoint", () => {
    const mutation = defineCssVariables(
      {
        breakpoints: runtimeBreakpoints,
        pages: {
          homePageId: "home",
          rootFolderId: "root",
          pages: new Map([
            [
              "home",
              {
                id: "home",
                name: "Home",
                title: "",
                rootInstanceId: "root",
                meta: {},
                path: "",
              },
            ],
          ]),
          folders: new Map(),
        },
        styles: new Map(),
        styleSources: new Map(),
        styleSourceSelections: new Map(),
      },
      { vars: { "--color": "red" } },
      { createId }
    );

    expect(mutation.result.names).toEqual(["--color"]);
    expect(mutation.payload).toContainEqual({
      namespace: "styles",
      patches: [
        {
          op: "add",
          path: ["new-id:desktop:--color:"],
          value: createStyleDecl("new-id", "desktop", "--color", {
            type: "unparsed",
            value: "red",
          }),
        },
      ],
    });
  });

  test("renames css variable definitions and references", () => {
    const mutation = renameCssVariable(
      {
        styles: createStyleDeclMap([
          createStyleDecl("local", "base", "--old", "red"),
          createStyleDecl("local", "base", "color", "var(--old)"),
        ]),
        props: new Map(),
        styleSources: new Map(),
        styleSourceSelections: new Map(),
      },
      { oldName: "--old", newName: "--new" }
    );

    expect(mutation.result).toEqual({
      oldName: "--old",
      newName: "--new",
      styleKeys: [
        "local:base:--old:",
        "local:base:--new:",
        "local:base:color:",
      ],
      propIds: [],
    });
    expect(mutation.payload).toEqual([
      {
        namespace: "styles",
        patches: [
          { op: "remove", path: ["local:base:--old:"] },
          {
            op: "add",
            path: ["local:base:--new:"],
            value: createStyleDecl("local", "base", "--new", "red"),
          },
          {
            op: "replace",
            path: ["local:base:color:"],
            value: createStyleDecl("local", "base", "color", "var(--new)"),
          },
        ],
      },
    ]);
  });
});

describe("serializeDesignTokens", () => {
  test("filters, sorts, summarizes styles, and counts usage when requested", () => {
    expect(
      serializeDesignTokens({
        styleSources: sources([
          token("secondary", "Secondary"),
          token("primary", "Primary"),
          local("local"),
        ]),
        styles: createStyleDeclMap([
          createStyleDecl("primary", "base", "color", {
            type: "keyword",
            value: "red",
          }),
          createStyleDecl("secondary", "base", "marginTop", {
            type: "unit",
            value: 10,
            unit: "px",
          }),
        ]),
        styleSourceSelections: [
          { instanceId: "box-1", values: ["primary", "local"] },
          { instanceId: "box-2", values: ["primary"] },
          { instanceId: "box-3", values: ["secondary"] },
        ],
        filter: "Primary",
        withUsage: true,
      })
    ).toEqual({
      detail: "compact",
      filters: { filter: "Primary", withUsage: true },
      nextCursor: null,
      returnedCount: 1,
      total: 1,
      tokens: [
        {
          id: "primary",
          name: "Primary",
          declarationCount: 1,
          usageCount: 2,
        },
      ],
    });

    expect(
      serializeDesignTokens({
        styleSources: sources([
          token("secondary", "Secondary"),
          token("primary", "Primary"),
        ]),
        styles: [],
        styleSourceSelections: [
          { instanceId: "box-1", values: ["primary"] },
          { instanceId: "box-2", values: ["secondary"] },
          { instanceId: "box-3", values: ["secondary"] },
        ],
        sort: "usage",
      }).tokens.map((item) => item.id)
    ).toEqual(["secondary", "primary"]);
  });

  test("includes full token styles only in verbose output", () => {
    const tokenValue = {
      type: "unparsed" as const,
      value: `linear-gradient(${"red 0 1px, blue 1px 2px, ".repeat(80)}red)`,
    };
    const compact = serializeDesignTokens({
      styleSources: sources([token("primary", "Primary")]),
      styles: createStyleDeclMap([
        createStyleDecl("primary", "base", "backgroundImage", tokenValue),
      ]),
      styleSourceSelections: [],
    });
    const verbose = serializeDesignTokens({
      styleSources: sources([token("primary", "Primary")]),
      styles: createStyleDeclMap([
        createStyleDecl("primary", "base", "backgroundImage", tokenValue),
      ]),
      styleSourceSelections: [],
      verbose: true,
    });
    expect(verbose).toEqual({
      detail: "verbose",
      filters: {},
      nextCursor: null,
      returnedCount: 1,
      total: 1,
      tokens: [
        {
          id: "primary",
          name: "Primary",
          declarationCount: 1,
          styles: { backgroundImage: tokenValue },
          usageCount: 0,
        },
      ],
    });
    expect(verbose.tokens[0]).toMatchObject(compact.tokens[0] ?? {});
    expect(JSON.stringify(compact).length).toBeLessThan(
      JSON.stringify(verbose).length * 0.5
    );
  });

  test("includes usage by default and allows omitting it", () => {
    const input = {
      styleSources: sources([token("primary", "Primary")]),
      styles: [],
      styleSourceSelections: [{ instanceId: "box-1", values: ["primary"] }],
    };
    expect(serializeDesignTokens(input).tokens[0]?.usageCount).toBe(1);
    expect(
      serializeDesignTokens({ ...input, withUsage: false }).tokens[0]
        ?.usageCount
    ).toBeUndefined();
  });
});

test("expands style values without changing pagination or filters", () => {
  const largeValue = {
    type: "unparsed" as const,
    value: `linear-gradient(${"red 0 1px, blue 1px 2px, ".repeat(80)}red)`,
  };
  const largeStyle = { ...displayStyle, value: largeValue };
  const styleState = {
    pages: undefined,
    instances: undefined,
    styles: new Map([[displayStyleKey, largeStyle]]),
    styleSources: new Map([[localStyleSource.id, localStyleSource]]),
    styleSourceSelections: new Map([
      ["box", { instanceId: "box", values: [localStyleSource.id] }],
    ]),
  };
  const compact = getStyleDeclarations(styleState, { limit: 1 });
  const verbose = getStyleDeclarations(styleState, {
    limit: 1,
    verbose: true,
  });

  expect(compact).toMatchObject({
    detail: "compact",
    returnedCount: 1,
    declarations: [{ property: "display", valueType: "unparsed" }],
  });
  expect(compact.declarations[0]).not.toHaveProperty("value");
  expect(verbose).toMatchObject({
    detail: "verbose",
    total: compact.total,
    returnedCount: compact.returnedCount,
    nextCursor: compact.nextCursor,
    declarations: [
      expect.objectContaining({
        ...compact.declarations[0],
        value: largeValue,
      }),
    ],
  });
  expect(JSON.stringify(compact).length).toBeLessThan(
    JSON.stringify(verbose).length * 0.5
  );
});

describe("getLocalStyleSourceId", () => {
  test("returns local style source id from selection", () => {
    const styleSources = sources([
      { id: "token", type: "token", name: "Token" },
      local("local"),
    ]);

    expect(
      getLocalStyleSourceId({
        styleSources,
        styleSourceSelection: {
          instanceId: "instance",
          values: ["token", "local"],
        },
      })
    ).toBe("local");
  });

  test("returns undefined when selection has no local source", () => {
    const styleSources = sources([
      { id: "token", type: "token", name: "Token" },
    ]);

    expect(
      getLocalStyleSourceId({
        styleSources,
        styleSourceSelection: {
          instanceId: "instance",
          values: ["token"],
        },
      })
    ).toBeUndefined();
  });
});

describe("style declaration helpers", () => {
  test("parse style and design token inputs used by the API", () => {
    expect(
      styleUpdateInput.parse({
        instanceId: "box",
        property: "color",
        value: { type: "keyword", value: "red" },
        createLocalIfMissing: true,
      })
    ).toEqual({
      instanceId: "box",
      property: "color",
      value: { type: "keyword", value: "red" },
      createLocalIfMissing: true,
    });

    expect(
      styleDeleteInput.parse({ instanceId: "box", property: "color" })
    ).toEqual({
      instanceId: "box",
      property: "color",
    });

    expect(
      styleReplaceInput.parse({
        property: "color",
        fromValue: { type: "keyword", value: "red" },
        toValue: { type: "keyword", value: "blue" },
        pagePath: "/about",
      })
    ).toEqual({
      property: "color",
      fromValue: { type: "keyword", value: "red" },
      toValue: { type: "keyword", value: "blue" },
      pagePath: "/about",
    });

    expect(
      designTokenCreateInput.parse({
        name: "Primary",
        styles: { color: { type: "keyword", value: "red" } },
        declarations: [
          {
            property: "fontSize",
            value: { type: "unit", value: 16, unit: "px" },
          },
        ],
      })
    ).toEqual({
      name: "Primary",
      styles: { color: { type: "keyword", value: "red" } },
      declarations: [
        {
          property: "fontSize",
          value: { type: "unit", value: 16, unit: "px" },
        },
      ],
    });
  });

  test("reject empty design token names", () => {
    expect(() => designTokenCreateInput.parse({ name: "" })).toThrow();
  });

  test("creates token style sources and omits unlocked state", () => {
    expect(createTokenStyleSource({ id: "token", name: "Token" })).toEqual({
      type: "token",
      id: "token",
      name: "Token",
    });
    expect(
      createTokenStyleSource({ id: "token", name: "Token", locked: true })
    ).toEqual({
      type: "token",
      id: "token",
      name: "Token",
      locked: true,
    });
  });

  test("finds design token style sources", () => {
    expect(
      findDesignToken(
        [local("local"), { id: "token", type: "token", name: "Token" }],
        "token"
      )
    ).toEqual({ id: "token", type: "token", name: "Token" });
    expect(findDesignToken([local("local")], "local")).toBeUndefined();
  });

  test("creates style declarations through the sdk schema", () => {
    expect(
      createStyleDeclValue({
        styleSourceId: "local",
        breakpointId: "base",
        property: "color",
        value: { type: "keyword", value: "red" },
      })
    ).toEqual({
      styleSourceId: "local",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    });
  });

  test("creates style declarations from user input with base breakpoint default", () => {
    expect(
      createStyleDeclFromInput({
        styleSourceId: "token",
        property: "color",
        value: { type: "keyword", value: "red" },
        state: ":hover",
      })
    ).toEqual({
      styleSourceId: "token",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
      state: ":hover",
    });
  });

  test("creates style declaration keys from user input with base breakpoint default", () => {
    expect(
      getStyleDeclKeyFromInput({
        styleSourceId: "token",
        property: "color",
        state: ":hover",
      })
    ).toBe("token:base:color::hover");
  });

  test("sets and deletes style declarations through shared mutable helpers", () => {
    const styles = new Map();

    const { styleDecl, styleKey } = setStyleDeclMutable({
      styles,
      styleSourceId: "local",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
      listed: true,
    });

    expect(styleKey).toBe("local:base:color:");
    expect(styles.get(styleKey)).toEqual(styleDecl);
    expect(
      deleteStyleDeclMutable({
        styles,
        styleSourceId: "local",
        breakpointId: "base",
        property: "color",
      })
    ).toBe(true);
    expect(styles.has(styleKey)).toBe(false);
  });

  test("creates design token style inputs from styles map and declarations", () => {
    expect(
      createDesignTokenStyleInputs({
        styles: {
          color: { type: "keyword", value: "red" },
        },
        declarations: [
          {
            property: "fontSize",
            value: { type: "unit", value: 16, unit: "px" },
            breakpoint: "desktop",
          },
        ],
      })
    ).toEqual([
      { property: "color", value: { type: "keyword", value: "red" } },
      {
        property: "fontSize",
        value: { type: "unit", value: 16, unit: "px" },
        breakpoint: "desktop",
      },
    ]);
  });

  test("updates style declarations through the sdk schema", () => {
    const declaration = createStyleDeclValue({
      styleSourceId: "local",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    });

    expect(
      updateStyleDecl(declaration, {
        value: { type: "keyword", value: "blue" },
      })
    ).toEqual({
      styleSourceId: "local",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "blue" },
    });
  });
});

describe("createStyleSourceSelectionAddPatch", () => {
  const styleSources = sources([
    { id: "token", type: "token", name: "Token" },
    local("local"),
  ]);

  test("creates a style source selection when instance has none", () => {
    expect(
      createStyleSourceSelectionAddPatch({
        styleSourceSelection: undefined,
        styleSources,
        instanceId: "instance",
        styleSourceId: "token",
      })
    ).toEqual({
      op: "add",
      path: ["instance"],
      value: { instanceId: "instance", values: ["token"] },
    });
  });

  test("inserts before local style source by default", () => {
    expect(
      createStyleSourceSelectionAddPatch({
        styleSourceSelection: {
          instanceId: "instance",
          values: ["local"],
        },
        styleSources,
        instanceId: "instance",
        styleSourceId: "token",
      })
    ).toEqual({
      op: "add",
      path: ["instance", "values", 0],
      value: "token",
    });
  });

  test("does not create a patch when source is already selected", () => {
    expect(
      createStyleSourceSelectionAddPatch({
        styleSourceSelection: {
          instanceId: "instance",
          values: ["token"],
        },
        styleSources,
        instanceId: "instance",
        styleSourceId: "token",
      })
    ).toBeUndefined();
  });
});

describe("createStyleSourceSelectionAttachPayload", () => {
  const styleSources = sources([
    { id: "token", type: "token", name: "Token" },
    local("local"),
  ]);

  test("creates a selection payload for attached style sources", () => {
    expect(
      createStyleSourceSelectionAttachPayload({
        instanceIds: ["instance-a", "instance-b"],
        styleSourceSelections: [
          { instanceId: "instance-b", values: ["local"] },
        ],
        styleSources,
        styleSourceId: "token",
      })
    ).toEqual([
      {
        namespace: "styleSourceSelections",
        patches: [
          {
            op: "add",
            path: ["instance-a"],
            value: { instanceId: "instance-a", values: ["token"] },
          },
          {
            op: "add",
            path: ["instance-b", "values", 0],
            value: "token",
          },
        ],
      },
    ]);
  });

  test("returns empty payload when style source is already attached", () => {
    expect(
      createStyleSourceSelectionAttachPayload({
        instanceIds: ["instance"],
        styleSourceSelections: [{ instanceId: "instance", values: ["token"] }],
        styleSources,
        styleSourceId: "token",
      })
    ).toEqual([]);
  });
});

describe("createStyleSourceSelectionRemovePlan", () => {
  test("finds the selected style source index", () => {
    expect(
      createStyleSourceSelectionRemovePlan({
        styleSourceSelection: {
          instanceId: "instance",
          values: ["token-a", "token-b"],
        },
        styleSourceId: "token-b",
      })
    ).toEqual({ type: "remove", index: 1 });
  });

  test("reports missing selection", () => {
    expect(
      createStyleSourceSelectionRemovePlan({
        styleSourceSelection: undefined,
        styleSourceId: "token",
      })
    ).toEqual({ type: "missing" });
  });
});

describe("createStyleSourceSelectionRemovePatch", () => {
  test("creates a remove patch for selected style source", () => {
    expect(
      createStyleSourceSelectionRemovePatch({
        styleSourceSelection: {
          instanceId: "instance",
          values: ["token-a", "token-b"],
        },
        instanceId: "instance",
        styleSourceId: "token-b",
      })
    ).toEqual({
      op: "remove",
      path: ["instance", "values", 1],
    });
  });

  test("does not create a patch when source is not selected", () => {
    expect(
      createStyleSourceSelectionRemovePatch({
        styleSourceSelection: {
          instanceId: "instance",
          values: ["token-a"],
        },
        instanceId: "instance",
        styleSourceId: "token-b",
      })
    ).toBeUndefined();
  });
});

describe("createStyleSourceSelectionDetachPayload", () => {
  test("creates a selection payload for detached style sources", () => {
    expect(
      createStyleSourceSelectionDetachPayload({
        instanceIds: ["instance"],
        styleSourceSelections: [
          { instanceId: "instance", values: ["token-a", "token-b"] },
        ],
        styleSourceId: "token-b",
      })
    ).toEqual([
      {
        namespace: "styleSourceSelections",
        patches: [
          {
            op: "remove",
            path: ["instance", "values", 1],
          },
        ],
      },
    ]);
  });

  test("returns empty payload when style source is not attached", () => {
    expect(
      createStyleSourceSelectionDetachPayload({
        instanceIds: ["instance"],
        styleSourceSelections: [{ instanceId: "instance", values: ["token"] }],
        styleSourceId: "missing",
      })
    ).toEqual([]);
  });
});

describe("removeStyleSourceFromInstanceMutable", () => {
  test("removes selected style source", () => {
    const styleSourceSelections: StyleSourceSelections = new Map([
      ["instance", { instanceId: "instance", values: ["token-a", "token-b"] }],
    ]);

    removeStyleSourceFromInstanceMutable({
      styleSourceSelections,
      instanceId: "instance",
      styleSourceId: "token-a",
    });

    expect(styleSourceSelections.get("instance")?.values).toEqual(["token-b"]);
  });
});

describe("createDesignTokenExtractionPayload", () => {
  test("extracts local styles into a new token and attaches it to instances", () => {
    const { payload, styleKeys } = createDesignTokenExtractionPayload({
      tokenId: "token",
      tokenName: "Primary",
      instanceIds: ["box"],
      styleSources: sources([
        local("local"),
        { id: "existing-token", type: "token", name: "Existing" },
      ]),
      styleSourceSelections: [
        {
          instanceId: "box",
          values: ["existing-token", "local"],
        },
      ],
      styles: [
        createStyleDecl("local", "base", "color", {
          type: "keyword",
          value: "red",
        }),
        createStyleDecl("existing-token", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
      ],
    });

    expect(payload).toEqual([
      {
        namespace: "styleSources",
        patches: [
          {
            op: "add",
            path: ["token"],
            value: { type: "token", id: "token", name: "Primary" },
          },
        ],
      },
      {
        namespace: "styles",
        patches: [
          {
            op: "add",
            path: ["token:base:color:"],
            value: createStyleDecl("token", "base", "color", {
              type: "keyword",
              value: "red",
            }),
          },
        ],
      },
      {
        namespace: "styleSourceSelections",
        patches: [
          {
            op: "add",
            path: ["box", "values", 1],
            value: "token",
          },
        ],
      },
    ]);
    expect(styleKeys).toEqual(["token:base:color:"]);
  });

  test("removes extracted local properties when requested", () => {
    const { payload, styleKeys } = createDesignTokenExtractionPayload({
      tokenId: "token",
      tokenName: "Primary",
      instanceIds: ["box"],
      styleSources: sources([local("local")]),
      styleSourceSelections: [{ instanceId: "box", values: ["local"] }],
      styles: [
        createStyleDecl("local", "base", "color", {
          type: "keyword",
          value: "red",
        }),
        createStyleDecl("local", "base", "fontSize", {
          type: "unit",
          value: 16,
          unit: "px",
        }),
      ],
      removeLocalProps: ["color"],
    });

    expect(payload[1]).toEqual({
      namespace: "styles",
      patches: [
        {
          op: "add",
          path: ["token:base:color:"],
          value: createStyleDecl("token", "base", "color", {
            type: "keyword",
            value: "red",
          }),
        },
        {
          op: "remove",
          path: ["local:base:color:"],
        },
      ],
    });
    expect(styleKeys).toEqual(["token:base:color:"]);
  });

  test("dedupes token declarations extracted from multiple local sources", () => {
    const { payload, styleKeys } = createDesignTokenExtractionPayload({
      tokenId: "token",
      tokenName: "Primary",
      instanceIds: ["box-a", "box-b"],
      styleSources: sources([
        { id: "local-a", type: "local" },
        { id: "local-b", type: "local" },
      ]),
      styleSourceSelections: [
        { instanceId: "box-a", values: ["local-a"] },
        { instanceId: "box-b", values: ["local-b"] },
      ],
      styles: [
        createStyleDecl("local-a", "base", "color", {
          type: "keyword",
          value: "red",
        }),
        createStyleDecl("local-b", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
    });

    expect(payload[1]).toEqual({
      namespace: "styles",
      patches: [
        {
          op: "add",
          path: ["token:base:color:"],
          value: createStyleDecl("token", "base", "color", {
            type: "keyword",
            value: "red",
          }),
        },
      ],
    });
    expect(styleKeys).toEqual(["token:base:color:"]);
  });

  test("omits empty styles and selection namespaces", () => {
    const { payload, styleKeys } = createDesignTokenExtractionPayload({
      tokenId: "token",
      tokenName: "Primary",
      instanceIds: [],
      styleSources: sources([]),
      styleSourceSelections: [],
      styles: [],
    });

    expect(payload).toEqual([
      {
        namespace: "styleSources",
        patches: [
          {
            op: "add",
            path: ["token"],
            value: { type: "token", id: "token", name: "Primary" },
          },
        ],
      },
    ]);
    expect(styleKeys).toEqual([]);
  });
});

describe("createStyleDeclarationUpdatePayload", () => {
  test("normalizes CSS property names before creating style keys", () => {
    const { payload, styleKeys } = createStyleDeclarationUpdatePayload({
      styleSources: sources([local("local")]),
      styleSourceSelections: [{ instanceId: "box", values: ["local"] }],
      styles: [],
      createId,
      updates: [
        {
          instanceId: "box",
          property: "background-color",
          value: { type: "keyword", value: "black" },
        },
      ],
    });

    expect(payload).toEqual([
      {
        namespace: "styles",
        patches: [
          {
            op: "add",
            path: ["local:base:backgroundColor:"],
            value: createStyleDecl("local", "base", "backgroundColor", {
              type: "keyword",
              value: "black",
            }),
          },
        ],
      },
    ]);
    expect(styleKeys).toEqual(["local:base:backgroundColor:"]);
  });

  test("creates style add patches for local style sources", () => {
    const { payload, styleKeys, missingLocalStyleSourceInstanceIds } =
      createStyleDeclarationUpdatePayload({
        styleSources: sources([local("local")]),
        styleSourceSelections: [{ instanceId: "box", values: ["local"] }],
        styles: [],
        createId,
        updates: [
          {
            instanceId: "box",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
        ],
      });

    expect(payload).toEqual([
      {
        namespace: "styles",
        patches: [
          {
            op: "add",
            path: ["local:base:color:"],
            value: createStyleDecl("local", "base", "color", {
              type: "keyword",
              value: "red",
            }),
          },
        ],
      },
    ]);
    expect(styleKeys).toEqual(["local:base:color:"]);
    expect(missingLocalStyleSourceInstanceIds).toEqual([]);
  });

  test("reports missing local style source when creation is disabled", () => {
    const result = createStyleDeclarationUpdatePayload({
      styleSources: new Map(),
      styleSourceSelections: [],
      styles: [],
      createId,
      updates: [
        {
          instanceId: "box",
          property: "color",
          value: { type: "keyword", value: "red" },
          createLocalIfMissing: false,
        },
      ],
    });

    expect(result).toEqual({
      payload: [],
      styleKeys: [],
      missingLocalStyleSourceInstanceIds: ["box"],
    });
  });

  test("coalesces repeated style keys within the same batch", () => {
    const { payload, styleKeys } = createStyleDeclarationUpdatePayload({
      styleSources: sources([local("local")]),
      styleSourceSelections: [{ instanceId: "box", values: ["local"] }],
      styles: [],
      createId,
      updates: [
        {
          instanceId: "box",
          property: "color",
          value: { type: "keyword", value: "red" },
        },
        {
          instanceId: "box",
          property: "color",
          value: { type: "keyword", value: "blue" },
        },
      ],
    });

    expect(payload).toEqual([
      {
        namespace: "styles",
        patches: [
          {
            op: "add",
            path: ["local:base:color:"],
            value: createStyleDecl("local", "base", "color", {
              type: "keyword",
              value: "blue",
            }),
          },
        ],
      },
    ]);
    expect(styleKeys).toEqual(["local:base:color:"]);
  });
});

describe("createStyleDeclarationDeletePayload", () => {
  test("normalizes CSS property names before deleting style keys", () => {
    const { payload, styleKeys } = createStyleDeclarationDeletePayload({
      styleSources: sources([local("local")]),
      styleSourceSelections: [{ instanceId: "box", values: ["local"] }],
      styles: [
        createStyleDecl("local", "base", "fontSize", {
          type: "unit",
          value: 16,
          unit: "px",
        }),
      ],
      deletions: [{ instanceId: "box", property: "font-size" }],
    });

    expect(payload).toEqual([
      {
        namespace: "styles",
        patches: [{ op: "remove", path: ["local:base:fontSize:"] }],
      },
    ]);
    expect(styleKeys).toEqual(["local:base:fontSize:"]);
  });

  test("creates remove patches for existing local declarations", () => {
    const { payload, styleKeys } = createStyleDeclarationDeletePayload({
      styleSources: sources([local("local")]),
      styleSourceSelections: [{ instanceId: "box", values: ["local"] }],
      styles: [
        createStyleDecl("local", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
      deletions: [{ instanceId: "box", property: "color" }],
    });

    expect(payload).toEqual([
      {
        namespace: "styles",
        patches: [{ op: "remove", path: ["local:base:color:"] }],
      },
    ]);
    expect(styleKeys).toEqual(["local:base:color:"]);
  });

  test("skips missing local declarations", () => {
    expect(
      createStyleDeclarationDeletePayload({
        styleSources: new Map(),
        styleSourceSelections: [],
        styles: [],
        deletions: [{ instanceId: "box", property: "color" }],
      })
    ).toEqual({ payload: [], styleKeys: [] });
  });
});

describe("createStyleValueReplacementPayload", () => {
  test("normalizes CSS property names before replacing style values", () => {
    const { payload, styleKeys } = createStyleValueReplacementPayload({
      styleSources: [local("local")],
      styleSourceSelections: [{ instanceId: "box", values: ["local"] }],
      styles: [
        createStyleDecl("local", "base", "fontWeight", {
          type: "keyword",
          value: "400",
        }),
      ],
      property: "font-weight",
      fromValue: { type: "keyword", value: "400" },
      toValue: { type: "keyword", value: "700" },
    });

    expect(payload).toEqual([
      {
        namespace: "styles",
        patches: [
          {
            op: "replace",
            path: ["local:base:fontWeight:"],
            value: createStyleDecl("local", "base", "fontWeight", {
              type: "keyword",
              value: "700",
            }),
          },
        ],
      },
    ]);
    expect(styleKeys).toEqual(["local:base:fontWeight:"]);
  });

  test("replaces matching local style values in scope", () => {
    const { payload, styleKeys } = createStyleValueReplacementPayload({
      styleSources: [
        local("local"),
        { id: "token", type: "token", name: "Token" },
      ],
      styleSourceSelections: [
        { instanceId: "box", values: ["token", "local"] },
        { instanceId: "other", values: ["other-local"] },
      ],
      instanceIds: new Set(["box"]),
      styles: [
        createStyleDecl("local", "base", "color", {
          type: "keyword",
          value: "red",
        }),
        createStyleDecl("token", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
      property: "color",
      fromValue: { type: "keyword", value: "red" },
      toValue: { type: "keyword", value: "blue" },
    });

    expect(payload).toEqual([
      {
        namespace: "styles",
        patches: [
          {
            op: "replace",
            path: ["local:base:color:"],
            value: createStyleDecl("local", "base", "color", {
              type: "keyword",
              value: "blue",
            }),
          },
        ],
      },
    ]);
    expect(styleKeys).toEqual(["local:base:color:"]);
  });
});

describe("design token patch helpers", () => {
  test("creates token and style patches", () => {
    const { payload, tokenIds, errors } = createDesignTokenCreatePayload({
      styleSources: new Map(),
      createId,
      tokens: [
        {
          tokenId: "token",
          name: "Primary",
          styles: { color: { type: "keyword", value: "red" } },
        },
      ],
    });

    expect(errors).toEqual([]);
    expect(tokenIds).toEqual(["token"]);
    expect(payload).toEqual([
      {
        namespace: "styleSources",
        patches: [
          {
            op: "add",
            path: ["token"],
            value: { type: "token", id: "token", name: "Primary" },
          },
        ],
      },
      {
        namespace: "styles",
        patches: [
          {
            op: "add",
            path: ["token:base:color:"],
            value: createStyleDecl("token", "base", "color", {
              type: "keyword",
              value: "red",
            }),
          },
        ],
      },
    ]);
  });

  test("does not emit empty style patch namespace for token without styles", () => {
    const { payload, tokenIds, errors } = createDesignTokenCreatePayload({
      styleSources: new Map(),
      createId,
      tokens: [{ tokenId: "token", name: "Primary" }],
    });

    expect(errors).toEqual([]);
    expect(tokenIds).toEqual(["token"]);
    expect(payload).toEqual([
      {
        namespace: "styleSources",
        patches: [
          {
            op: "add",
            path: ["token"],
            value: { type: "token", id: "token", name: "Primary" },
          },
        ],
      },
    ]);
  });

  test("reports token create conflicts", () => {
    const result = createDesignTokenCreatePayload({
      styleSources: sources([{ id: "token", type: "token", name: "Primary" }]),
      createId,
      tokens: [
        { tokenId: "token", name: "Primary" },
        { tokenId: "next", name: "Primary" },
      ],
    });

    expect(result.errors).toEqual([
      { type: "duplicate-id", tokenId: "token" },
      {
        type: "invalid-name",
        tokenId: "next",
        error: { type: "duplicate", id: "next" },
      },
    ]);
  });

  test("updates token styles with same-batch add then replace", () => {
    const { payload, styleKeys } = createDesignTokenStyleUpdatePayload({
      designTokenId: "token",
      styles: [],
      updates: [
        {
          property: "color",
          value: { type: "keyword", value: "red" },
        },
        {
          property: "color",
          value: { type: "keyword", value: "blue" },
        },
      ],
    });

    expect(payload).toEqual([
      {
        namespace: "styles",
        patches: [
          {
            op: "add",
            path: ["token:base:color:"],
            value: createStyleDecl("token", "base", "color", {
              type: "keyword",
              value: "red",
            }),
          },
          {
            op: "replace",
            path: ["token:base:color:"],
            value: createStyleDecl("token", "base", "color", {
              type: "keyword",
              value: "blue",
            }),
          },
        ],
      },
    ]);
    expect(styleKeys).toEqual(["token:base:color:", "token:base:color:"]);
  });

  test("returns empty payload when token style updates are empty", () => {
    const { payload, styleKeys } = createDesignTokenStyleUpdatePayload({
      designTokenId: "token",
      styles: [],
      updates: [],
    });

    expect(payload).toEqual([]);
    expect(styleKeys).toEqual([]);
  });

  test("deletes existing token styles", () => {
    const { payload, styleKeys } = createDesignTokenStyleDeletePayload({
      designTokenId: "token",
      styles: [
        createStyleDecl("token", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
      deletions: [{ property: "color" }],
    });

    expect(payload).toEqual([
      {
        namespace: "styles",
        patches: [{ op: "remove", path: ["token:base:color:"] }],
      },
    ]);
    expect(styleKeys).toEqual(["token:base:color:"]);
  });
});

describe("validateStyleSourceName", () => {
  test("validates required and duplicate token names", () => {
    const styleSources = sources([
      { id: "token", type: "token", name: "Token" },
      local("local"),
    ]);

    expect(
      validateStyleSourceName({
        id: "next",
        name: "",
        styleSources,
      })
    ).toEqual({ type: "minlength", id: "next" });
    expect(
      validateStyleSourceName({
        id: "next",
        name: "Token",
        styleSources,
      })
    ).toEqual({ type: "duplicate", id: "next" });
    expect(
      validateStyleSourceName({
        id: "token",
        name: "Token",
        styleSources,
      })
    ).toBeUndefined();
  });
});

describe("getOrCreateLocalStyleSourceIdMutable", () => {
  test("returns existing local style source", () => {
    const styleSources = sources([local("local")]);
    const styleSourceSelections: StyleSourceSelections = new Map([
      ["instance", { instanceId: "instance", values: ["local"] }],
    ]);

    expect(
      getOrCreateLocalStyleSourceIdMutable({
        styleSourceSelections,
        styleSources,
        instanceId: "instance",
        createId: () => "new-local",
      })
    ).toBe("local");
    expect(Array.from(styleSources.values())).toEqual([local("local")]);
  });

  test("creates local style source on existing token selection", () => {
    const styleSources = sources([
      { id: "token", type: "token", name: "Token" },
    ]);
    const styleSourceSelections: StyleSourceSelections = new Map([
      ["instance", { instanceId: "instance", values: ["token"] }],
    ]);

    expect(
      getOrCreateLocalStyleSourceIdMutable({
        styleSourceSelections,
        styleSources,
        instanceId: "instance",
        createId: () => "local",
      })
    ).toBe("local");
    expect(styleSources.get("local")).toEqual(local("local"));
    expect(styleSourceSelections.get("instance")?.values).toEqual([
      "token",
      "local",
    ]);
  });

  test("creates selection when missing", () => {
    const styleSources: StyleSources = new Map();
    const styleSourceSelections: StyleSourceSelections = new Map();

    expect(
      getOrCreateLocalStyleSourceIdMutable({
        styleSourceSelections,
        styleSources,
        instanceId: "instance",
        createId: () => "local",
      })
    ).toBe("local");
    expect(styleSourceSelections.get("instance")).toEqual({
      instanceId: "instance",
      values: ["local"],
    });
  });
});

describe("createLocalStyleSourcePlan", () => {
  test("returns existing local style source", () => {
    const styleSources = sources([local("local")]);

    expect(
      createLocalStyleSourcePlan({
        styleSources,
        styleSourceSelection: { instanceId: "instance", values: ["local"] },
        instanceId: "instance",
      })
    ).toEqual({ styleSourceId: "local" });
  });

  test("creates style source and selection when instance has no selection", () => {
    const styleSources: StyleSources = new Map();

    expect(
      createLocalStyleSourcePlan({
        styleSources,
        styleSourceSelection: undefined,
        instanceId: "instance",
        createId: () => "local",
      })
    ).toEqual({
      styleSourceId: "local",
      styleSource: { type: "local", id: "local" },
      selection: { instanceId: "instance", values: ["local"] },
    });
  });

  test("appends style source to existing selection without local source", () => {
    const styleSources = sources([token("token", "Token")]);

    expect(
      createLocalStyleSourcePlan({
        styleSources,
        styleSourceSelection: { instanceId: "instance", values: ["token"] },
        instanceId: "instance",
        createId: () => "local",
      })
    ).toEqual({
      styleSourceId: "local",
      styleSource: { type: "local", id: "local" },
      selectionValueIndex: 1,
    });
  });
});

describe("getStyleSourceInsertionIndex", () => {
  const styleSources = sources([token("token", "Token"), local("local")]);

  test("inserts before local style source by default", () => {
    expect(
      getStyleSourceInsertionIndex({
        styleSourceIds: ["token", "local"],
        styleSources,
      })
    ).toBe(1);
  });

  test("inserts after local style source when requested", () => {
    expect(
      getStyleSourceInsertionIndex({
        styleSourceIds: ["token", "local"],
        styleSources,
        position: "after-local",
      })
    ).toBe(2);
  });

  test("inserts at end when no local style source exists", () => {
    expect(
      getStyleSourceInsertionIndex({
        styleSourceIds: ["token"],
        styleSources,
      })
    ).toBe(1);
  });
});

describe("addStyleSourceToInstanceMutable", () => {
  test("creates missing selection and adds style source", () => {
    const styleSources = sources([
      { id: "token", type: "token", name: "Token" },
    ]);
    const styleSourceSelections: StyleSourceSelections = new Map();

    addStyleSourceToInstanceMutable({
      styleSourceSelections,
      styleSources,
      instanceId: "instance",
      styleSourceId: "token",
    });

    expect(styleSourceSelections.get("instance")).toEqual({
      instanceId: "instance",
      values: ["token"],
    });
  });

  test("adds token before local style source", () => {
    const styleSources = sources([
      { id: "token", type: "token", name: "Token" },
      local("local"),
    ]);
    const styleSourceSelections: StyleSourceSelections = new Map([
      ["instance", { instanceId: "instance", values: ["local"] }],
    ]);

    addStyleSourceToInstanceMutable({
      styleSourceSelections,
      styleSources,
      instanceId: "instance",
      styleSourceId: "token",
    });

    expect(styleSourceSelections.get("instance")?.values).toEqual([
      "token",
      "local",
    ]);
  });
});

describe("createLocalStyleSourceClonePlan", () => {
  test("clones local style sources and remaps copied selections", () => {
    const plan = createLocalStyleSourceClonePlan({
      styleSourceSelections: [
        { instanceId: "source", values: ["token", "local"] },
        { instanceId: "ignored", values: ["local"] },
      ],
      styleSources: [
        { id: "token", type: "token", name: "Token" },
        local("local"),
      ],
      newInstanceIds: new Map([["source", "copy"]]),
      createId: () => "local-copy",
    });

    expect(plan.localStyleSourceIds).toEqual(
      new Map([["local", "local-copy"]])
    );
    expect(plan.localStyleSources).toEqual([
      { id: "local-copy", type: "local" },
    ]);
    expect(plan.selections).toEqual([
      { instanceId: "copy", values: ["token", "local-copy"] },
    ]);
  });

  test("reuses a cloned local style source across copied selections", () => {
    let idIndex = 0;
    const plan = createLocalStyleSourceClonePlan({
      styleSourceSelections: [
        { instanceId: "source-1", values: ["local"] },
        { instanceId: "source-2", values: ["local"] },
      ],
      styleSources: [local("local")],
      newInstanceIds: new Map([
        ["source-1", "copy-1"],
        ["source-2", "copy-2"],
      ]),
      createId: () => `local-copy-${idIndex++}`,
    });

    expect(plan.localStyleSourceIds).toEqual(
      new Map([["local", "local-copy-0"]])
    );
    expect(plan.localStyleSources).toEqual([
      { id: "local-copy-0", type: "local" },
    ]);
    expect(plan.selections).toEqual([
      { instanceId: "copy-1", values: ["local-copy-0"] },
      { instanceId: "copy-2", values: ["local-copy-0"] },
    ]);
  });
});

describe("createLocalStyleSourcePatchPlan", () => {
  test("returns existing local style source", () => {
    const styleSources = sources([local("local")]);
    expect(
      createLocalStyleSourcePatchPlan({
        createdLocalSourceIds: new Map(),
        instanceId: "instance",
        styleSources,
        styleSourceSelection: { instanceId: "instance", values: ["local"] },
        shouldCreate: true,
      })
    ).toEqual({ styleSourceId: "local", payload: [] });
  });

  test("creates a missing selection", () => {
    const createdLocalSourceIds = new Map<string, string>();
    const result = createLocalStyleSourcePatchPlan({
      createdLocalSourceIds,
      instanceId: "instance",
      styleSources: new Map(),
      styleSourceSelection: undefined,
      shouldCreate: true,
    });
    const styleSourceId = result?.styleSourceId;

    expect(styleSourceId).toEqual(expect.any(String));
    expect(createdLocalSourceIds).toEqual(
      new Map([["instance", styleSourceId]])
    );
    expect(result).toEqual({
      styleSourceId,
      payload: [
        {
          namespace: "styleSources",
          patches: [
            {
              op: "add",
              path: [styleSourceId],
              value: { type: "local", id: styleSourceId },
            },
          ],
        },
        {
          namespace: "styleSourceSelections",
          patches: [
            {
              op: "add",
              path: ["instance"],
              value: { instanceId: "instance", values: [styleSourceId] },
            },
          ],
        },
      ],
    });
  });

  test("inserts into an existing selection", () => {
    const result = createLocalStyleSourcePatchPlan({
      createdLocalSourceIds: new Map(),
      instanceId: "instance",
      styleSources: new Map(),
      styleSourceSelection: { instanceId: "instance", values: ["token"] },
      shouldCreate: true,
    });

    expect(result?.payload[1]).toEqual({
      namespace: "styleSourceSelections",
      patches: [
        {
          op: "add",
          path: ["instance", "values", 1],
          value: result?.styleSourceId,
        },
      ],
    });
  });

  test("skips missing local style source when creation is disabled", () => {
    expect(
      createLocalStyleSourcePatchPlan({
        createdLocalSourceIds: new Map(),
        instanceId: "instance",
        styleSources: new Map(),
        styleSourceSelection: undefined,
        shouldCreate: false,
      })
    ).toBeUndefined();
  });

  test("prefers created local style source ids", () => {
    expect(
      getLocalStyleSourceIdWithCreated({
        createdLocalSourceIds: new Map([["instance", "created"]]),
        instanceId: "instance",
        styleSources: new Map(),
        styleSourceSelection: undefined,
      })
    ).toBe("created");
  });
});

describe("createStyleSourceSelectionAddPlan", () => {
  test("creates missing selection", () => {
    const styleSources = sources([
      { id: "token", type: "token", name: "Token" },
    ]);

    expect(
      createStyleSourceSelectionAddPlan({
        styleSourceSelection: undefined,
        styleSources,
        instanceId: "instance",
        styleSourceId: "token",
      })
    ).toEqual({
      type: "create",
      selection: { instanceId: "instance", values: ["token"] },
    });
  });

  test("skips existing style source", () => {
    const styleSources = sources([
      { id: "token", type: "token", name: "Token" },
    ]);

    expect(
      createStyleSourceSelectionAddPlan({
        styleSourceSelection: { instanceId: "instance", values: ["token"] },
        styleSources,
        instanceId: "instance",
        styleSourceId: "token",
      })
    ).toEqual({ type: "exists" });
  });

  test("inserts before local source by default", () => {
    const styleSources = sources([
      { id: "token", type: "token", name: "Token" },
      local("local"),
    ]);

    expect(
      createStyleSourceSelectionAddPlan({
        styleSourceSelection: { instanceId: "instance", values: ["local"] },
        styleSources,
        instanceId: "instance",
        styleSourceId: "token",
      })
    ).toEqual({ type: "insert", index: 0 });
  });
});

describe("deleteStyleSourceMutable", () => {
  test("deletes style source from styleSources map", () => {
    const styleSources: StyleSources = new Map([
      ["token1", token("token1", "Primary Color")],
      ["token2", token("token2", "Secondary Color")],
    ]);
    const styleSourceSelections: StyleSourceSelections = new Map();
    const styles: Styles = new Map();

    deleteStyleSourceMutable({
      styleSourceId: "token1",
      styleSources,
      styleSourceSelections,
      styles,
    });

    expect(styleSources.has("token1")).toBe(false);
    expect(styleSources.has("token2")).toBe(true);
  });

  test("removes style source from style source selections", () => {
    const styleSources: StyleSources = new Map([
      ["token1", token("token1", "Primary Color")],
    ]);
    const styleSourceSelections: StyleSourceSelections = new Map([
      ["instance1", { instanceId: "instance1", values: ["token1", "local1"] }],
      ["instance2", { instanceId: "instance2", values: ["token1"] }],
      ["instance3", { instanceId: "instance3", values: ["local2"] }],
    ]);
    const styles: Styles = new Map();

    deleteStyleSourceMutable({
      styleSourceId: "token1",
      styleSources,
      styleSourceSelections,
      styles,
    });

    const selection1 = styleSourceSelections.get("instance1");
    expect(selection1?.values).toEqual(["local1"]);

    const selection2 = styleSourceSelections.get("instance2");
    expect(selection2?.values).toEqual([]);

    const selection3 = styleSourceSelections.get("instance3");
    expect(selection3?.values).toEqual(["local2"]);
  });

  test("deletes all styles associated with the style source", () => {
    const styleSources: StyleSources = new Map([
      ["token1", token("token1", "Primary Color")],
    ]);
    const styleSourceSelections: StyleSourceSelections = new Map();
    const styles: Styles = new Map([
      [
        "token1:base:color",
        {
          breakpointId: "base",
          styleSourceId: "token1",
          property: "color",
          value: { type: "keyword", value: "red" },
        },
      ],
      [
        "token1:base:fontSize",
        {
          breakpointId: "base",
          styleSourceId: "token1",
          property: "fontSize",
          value: { type: "unit", value: 16, unit: "px" },
        },
      ],
      [
        "local1:base:display",
        {
          breakpointId: "base",
          styleSourceId: "local1",
          property: "display",
          value: { type: "keyword", value: "flex" },
        },
      ],
    ]);

    deleteStyleSourceMutable({
      styleSourceId: "token1",
      styleSources,
      styleSourceSelections,
      styles,
    });

    expect(styles.has("token1:base:color")).toBe(false);
    expect(styles.has("token1:base:fontSize")).toBe(false);
    expect(styles.has("local1:base:display")).toBe(true);
    expect(styles.size).toBe(1);
  });

  test("handles deletion of non-existent style source gracefully", () => {
    const styleSources: StyleSources = new Map();
    const styleSourceSelections: StyleSourceSelections = new Map();
    const styles: Styles = new Map();

    expect(() => {
      deleteStyleSourceMutable({
        styleSourceId: "non-existent",
        styleSources,
        styleSourceSelections,
        styles,
      });
    }).not.toThrow();
  });
});

describe("findUnusedTokens", () => {
  test("builds style source usages from selections", () => {
    const usages = getStyleSourceUsages([
      { instanceId: "box-1", values: ["token-1", "token-2"] },
      { instanceId: "box-2", values: ["token-1"] },
      { instanceId: "box-3", values: [] },
    ]);

    expect(usages.get("token-1")).toEqual(new Set(["box-1", "box-2"]));
    expect(usages.get("token-2")).toEqual(new Set(["box-1"]));
    expect(usages.has("token-3")).toBe(false);
  });

  test("identifies tokens with no usages", () => {
    const styleSources = sources([
      token("token1", "Used Token"),
      token("token2", "Unused Token"),
      token("token3", "Another Unused"),
      local("local1"),
    ]);
    const styleSourceUsages = new Map<string, Set<string>>([
      ["token1", new Set(["instance1", "instance2"])],
      ["token2", new Set()],
      ["local1", new Set(["instance3"])],
    ]);

    const unusedTokens = findUnusedTokens({ styleSources, styleSourceUsages });

    expect(unusedTokens).toContain("token2");
    expect(unusedTokens).toContain("token3");
    expect(unusedTokens).not.toContain("token1");
    expect(unusedTokens).not.toContain("local1");
    expect(unusedTokens.length).toBe(2);
  });

  test("returns empty array when all tokens are used", () => {
    const styleSources: StyleSources = new Map([
      ["token1", token("token1", "Used Token 1")],
      ["token2", token("token2", "Used Token 2")],
    ]);
    const styleSourceUsages = new Map([
      ["token1", new Set(["instance1"])],
      ["token2", new Set(["instance2"])],
    ]);

    const unusedTokens = findUnusedTokens({ styleSources, styleSourceUsages });

    expect(unusedTokens).toEqual([]);
  });

  test("ignores local style sources", () => {
    const styleSources: StyleSources = new Map([
      ["local1", local("local1")],
      ["local2", local("local2")],
    ]);
    const styleSourceUsages = new Map();

    const unusedTokens = findUnusedTokens({ styleSources, styleSourceUsages });

    expect(unusedTokens).toEqual([]);
  });

  test("treats undefined usages as unused", () => {
    const styleSources: StyleSources = new Map([
      ["token1", token("token1", "Unused Token")],
    ]);
    const styleSourceUsages = new Map();

    const unusedTokens = findUnusedTokens({ styleSources, styleSourceUsages });

    expect(unusedTokens).toEqual(["token1"]);
  });
});

describe("deleteStyleSourcesMutable", () => {
  test("deletes multiple style sources", () => {
    const styleSources: StyleSources = new Map([
      ["token1", token("token1", "Token 1")],
      ["token2", token("token2", "Token 2")],
      ["token3", token("token3", "Token 3")],
    ]);
    const styleSourceSelections: StyleSourceSelections = new Map();
    const styles: Styles = new Map();

    deleteStyleSourcesMutable({
      styleSourceIds: ["token1", "token3"],
      styleSources,
      styleSourceSelections,
      styles,
    });

    expect(styleSources.has("token1")).toBe(false);
    expect(styleSources.has("token2")).toBe(true);
    expect(styleSources.has("token3")).toBe(false);
  });

  test("removes deleted style sources from all selections", () => {
    const styleSources: StyleSources = new Map([
      ["token1", token("token1", "Token 1")],
      ["token2", token("token2", "Token 2")],
    ]);
    const styleSourceSelections: StyleSourceSelections = new Map([
      [
        "instance1",
        { instanceId: "instance1", values: ["token1", "token2", "local1"] },
      ],
      ["instance2", { instanceId: "instance2", values: ["token1"] }],
    ]);
    const styles: Styles = new Map();

    deleteStyleSourcesMutable({
      styleSourceIds: ["token1", "token2"],
      styleSources,
      styleSourceSelections,
      styles,
    });

    const selection1 = styleSourceSelections.get("instance1");
    expect(selection1?.values).toEqual(["local1"]);

    const selection2 = styleSourceSelections.get("instance2");
    expect(selection2?.values).toEqual([]);
  });

  test("deletes all associated styles", () => {
    const styleSources: StyleSources = new Map([
      ["token1", token("token1", "Token 1")],
      ["token2", token("token2", "Token 2")],
    ]);
    const styleSourceSelections: StyleSourceSelections = new Map();
    const styles: Styles = new Map([
      [
        "token1:base:color",
        {
          breakpointId: "base",
          styleSourceId: "token1",
          property: "color",
          value: { type: "keyword", value: "red" },
        },
      ],
      [
        "token2:base:fontSize",
        {
          breakpointId: "base",
          styleSourceId: "token2",
          property: "fontSize",
          value: { type: "unit", value: 16, unit: "px" },
        },
      ],
      [
        "local1:base:display",
        {
          breakpointId: "base",
          styleSourceId: "local1",
          property: "display",
          value: { type: "keyword", value: "flex" },
        },
      ],
    ]);

    deleteStyleSourcesMutable({
      styleSourceIds: ["token1", "token2"],
      styleSources,
      styleSourceSelections,
      styles,
    });

    expect(styles.has("token1:base:color")).toBe(false);
    expect(styles.has("token2:base:fontSize")).toBe(false);
    expect(styles.has("local1:base:display")).toBe(true);
    expect(styles.size).toBe(1);
  });

  test("handles empty array of style source IDs", () => {
    const styleSources: StyleSources = new Map([
      ["token1", token("token1", "Token 1")],
    ]);
    const styleSourceSelections: StyleSourceSelections = new Map();
    const styles: Styles = new Map();

    deleteStyleSourcesMutable({
      styleSourceIds: [],
      styleSources,
      styleSourceSelections,
      styles,
    });

    expect(styleSources.has("token1")).toBe(true);
  });
});

describe("validateAndRenameStyleSource", () => {
  test("returns undefined for valid rename", () => {
    const styleSources: StyleSources = new Map([
      ["token1", token("token1", "Old Name")],
      ["token2", token("token2", "Other Token")],
    ]);

    const error = validateAndRenameStyleSource({
      id: "token1",
      name: "New Name",
      styleSources,
    });

    expect(error).toBeUndefined();
  });

  test("returns minlength error for empty name", () => {
    const styleSources: StyleSources = new Map([
      ["token1", token("token1", "Old Name")],
    ]);

    const error = validateAndRenameStyleSource({
      id: "token1",
      name: "",
      styleSources,
    });

    expect(error).toEqual({ type: "minlength", id: "token1" });
  });

  test("returns minlength error for whitespace-only name", () => {
    const styleSources: StyleSources = new Map([
      ["token1", token("token1", "Old Name")],
    ]);

    const error = validateAndRenameStyleSource({
      id: "token1",
      name: "   ",
      styleSources,
    });

    expect(error).toEqual({ type: "minlength", id: "token1" });
  });

  test("returns duplicate error when name already exists", () => {
    const styleSources: StyleSources = new Map([
      ["token1", token("token1", "Primary Color")],
      ["token2", token("token2", "Secondary Color")],
    ]);

    const error = validateAndRenameStyleSource({
      id: "token1",
      name: "Secondary Color",
      styleSources,
    });

    expect(error).toEqual({ type: "duplicate", id: "token1" });
  });

  test("allows renaming to same name (no change)", () => {
    const styleSources: StyleSources = new Map([
      ["token1", token("token1", "Primary Color")],
    ]);

    const error = validateAndRenameStyleSource({
      id: "token1",
      name: "Primary Color",
      styleSources,
    });

    expect(error).toBeUndefined();
  });

  test("ignores local style sources when checking duplicates", () => {
    const styleSources = sources([
      token("token1", "Primary Color"),
      local("local1"),
    ]);

    const error = validateAndRenameStyleSource({
      id: "token1",
      name: "Some Name",
      styleSources,
    });

    expect(error).toBeUndefined();
  });
});

describe("renameStyleSourceMutable", () => {
  test("renames a token style source", () => {
    const styleSources: StyleSources = new Map([
      ["token1", token("token1", "Old Name")],
    ]);

    renameStyleSourceMutable({
      id: "token1",
      name: "New Name",
      styleSources,
    });

    const styleSource = styleSources.get("token1");
    expect(styleSource?.type).toBe("token");
    if (styleSource?.type === "token") {
      expect(styleSource.name).toBe("New Name");
    }
  });

  test("does not rename local style source", () => {
    const styleSources: StyleSources = new Map([["local1", local("local1")]]);

    renameStyleSourceMutable({
      id: "local1",
      name: "New Name",
      styleSources,
    });

    const styleSource = styleSources.get("local1");
    expect(styleSource?.type).toBe("local");
  });

  test("handles non-existent style source gracefully", () => {
    const styleSources: StyleSources = new Map();

    expect(() => {
      renameStyleSourceMutable({
        id: "non-existent",
        name: "New Name",
        styleSources,
      });
    }).not.toThrow();
  });

  test("preserves other properties of the style source", () => {
    const styleSources: StyleSources = new Map([
      ["token1", token("token1", "Old Name")],
    ]);

    renameStyleSourceMutable({
      id: "token1",
      name: "New Name",
      styleSources,
    });

    const styleSource = styleSources.get("token1");
    expect(styleSource?.id).toBe("token1");
    expect(styleSource?.type).toBe("token");
  });
});

describe("toggleStyleSourceLockMutable", () => {
  test("locks a token style source", () => {
    const styleSources: StyleSources = new Map([
      ["token1", token("token1", "Token")],
    ]);

    toggleStyleSourceLockMutable({
      id: "token1",
      locked: true,
      styleSources,
    });

    expect(styleSources.get("token1")).toEqual({
      type: "token",
      id: "token1",
      name: "Token",
      locked: true,
    });
  });

  test("unlocks a token style source by removing the locked field", () => {
    const styleSources: StyleSources = new Map([
      ["token1", token("token1", "Token", { locked: true })],
    ]);

    toggleStyleSourceLockMutable({
      id: "token1",
      locked: false,
      styleSources,
    });

    expect(styleSources.get("token1")).toEqual({
      type: "token",
      id: "token1",
      name: "Token",
    });
  });

  test("does not lock local style sources", () => {
    const styleSources: StyleSources = new Map([["local1", local("local1")]]);

    toggleStyleSourceLockMutable({
      id: "local1",
      locked: true,
      styleSources,
    });

    expect(styleSources.get("local1")).toEqual({
      type: "local",
      id: "local1",
    });
  });
});

describe("isStyleSourceLocked", () => {
  test("returns true only for locked tokens", () => {
    expect(
      isStyleSourceLocked({
        type: "token",
        id: "token1",
        name: "Token",
        locked: true,
      })
    ).toBe(true);
    expect(
      isStyleSourceLocked({
        type: "token",
        id: "token1",
        name: "Token",
      })
    ).toBe(false);
    expect(isStyleSourceLocked({ type: "local", id: "local1" })).toBe(false);
    expect(isStyleSourceLocked(undefined)).toBe(false);
  });
});

describe("deleteLocalStyleSourcesMutable", () => {
  test("deletes local style sources from styleSources map", () => {
    const localStyleSourceIds = new Set(["local1", "local2"]);
    const styleSources = sources([
      local("local1"),
      local("local2"),
      local("local3"),
      token("token1", "Token"),
    ]);
    const styles: Styles = new Map();

    deleteLocalStyleSourcesMutable({
      localStyleSourceIds,
      styleSources,
      styles,
    });

    expect(styleSources.has("local1")).toBe(false);
    expect(styleSources.has("local2")).toBe(false);
    expect(styleSources.has("local3")).toBe(true);
    expect(styleSources.has("token1")).toBe(true);
  });

  test("deletes styles associated with local style sources", () => {
    const localStyleSourceIds = new Set(["local1", "local2"]);
    const styleSources: StyleSources = new Map([
      ["local1", local("local1")],
      ["local2", local("local2")],
    ]);
    const styles: Styles = new Map([
      [
        "local1:base:color",
        {
          breakpointId: "base",
          styleSourceId: "local1",
          property: "color",
          value: { type: "keyword", value: "red" },
        },
      ],
      [
        "local2:base:fontSize",
        {
          breakpointId: "base",
          styleSourceId: "local2",
          property: "fontSize",
          value: { type: "unit", value: 16, unit: "px" },
        },
      ],
      [
        "local3:base:display",
        {
          breakpointId: "base",
          styleSourceId: "local3",
          property: "display",
          value: { type: "keyword", value: "flex" },
        },
      ],
    ]);

    deleteLocalStyleSourcesMutable({
      localStyleSourceIds,
      styleSources,
      styles,
    });

    expect(styles.has("local1:base:color")).toBe(false);
    expect(styles.has("local2:base:fontSize")).toBe(false);
    expect(styles.has("local3:base:display")).toBe(true);
    expect(styles.size).toBe(1);
  });

  test("handles empty set of local style source IDs", () => {
    const localStyleSourceIds = new Set<string>();
    const styleSources: StyleSources = new Map([["local1", local("local1")]]);
    const styles: Styles = new Map();

    deleteLocalStyleSourcesMutable({
      localStyleSourceIds,
      styleSources,
      styles,
    });

    expect(styleSources.has("local1")).toBe(true);
  });
});
describe("findDuplicateTokens", () => {
  const findDuplicates = ({
    styleSources,
    styles,
    breakpoints = baseBreakpoints,
  }: {
    styleSources: StyleSource[];
    styles: StyleDecl[];
    breakpoints?: Breakpoint[] | Map<string, Breakpoint>;
  }) =>
    findDuplicateTokens({
      styleSources: toMap(styleSources),
      styles: createStyleDeclMap(styles),
      breakpoints: Array.isArray(breakpoints)
        ? toMap(breakpoints)
        : breakpoints,
    });

  test("finds tokens with identical styles", () => {
    const duplicates = findDuplicates({
      styleSources: [
        { type: "token", id: "token1", name: "Primary Red" },
        { type: "token", id: "token2", name: "Accent Red" },
        { type: "token", id: "token3", name: "Blue" },
        { type: "local", id: "local1" },
      ],
      styles: [
        createStyleDecl("token1", "base", "color", {
          type: "keyword",
          value: "red",
        }),
        createStyleDecl("token2", "base", "color", {
          type: "keyword",
          value: "red",
        }),
        createStyleDecl("token3", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
      ],
    });

    expect(duplicates.size).toBe(2);
    expect(duplicates.get("token1")).toEqual(["token2"]);
    expect(duplicates.get("token2")).toEqual(["token1"]);
    expect(duplicates.has("token3")).toBe(false);
    expect(duplicates.has("local1")).toBe(false);
  });

  test("finds tokens with same name", () => {
    const duplicates = findDuplicates({
      styleSources: [
        { type: "token", id: "token1", name: "Primary" },
        { type: "token", id: "token2", name: "Primary" },
        { type: "token", id: "token3", name: "Secondary" },
      ],
      styles: [
        createStyleDecl("token1", "base", "color", {
          type: "keyword",
          value: "red",
        }),
        createStyleDecl("token2", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
        createStyleDecl("token3", "base", "color", {
          type: "keyword",
          value: "green",
        }),
      ],
    });

    expect(duplicates.size).toBe(2);
    expect(duplicates.get("token1")).toEqual(["token2"]);
    expect(duplicates.get("token2")).toEqual(["token1"]);
    expect(duplicates.has("token3")).toBe(false);
  });

  test("finds tokens with same name AND same styles without duplicating", () => {
    const duplicates = findDuplicates({
      styleSources: [
        { type: "token", id: "token1", name: "Primary" },
        { type: "token", id: "token2", name: "Primary" },
      ],
      styles: [
        createStyleDecl("token1", "base", "color", {
          type: "keyword",
          value: "red",
        }),
        createStyleDecl("token2", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
    });

    expect(duplicates.size).toBe(2);
    // Should list each token only once, not twice (once for name, once for styles)
    expect(duplicates.get("token1")).toEqual(["token2"]);
    expect(duplicates.get("token2")).toEqual(["token1"]);
  });

  test("finds mixed duplicates: some by style, some by name", () => {
    const duplicates = findDuplicates({
      styleSources: [
        { type: "token", id: "token1", name: "Red A" },
        { type: "token", id: "token2", name: "Red B" },
        { type: "token", id: "token3", name: "Duplicate Name" },
        { type: "token", id: "token4", name: "Duplicate Name" },
      ],
      styles: [
        createStyleDecl("token1", "base", "color", {
          type: "keyword",
          value: "red",
        }),
        createStyleDecl("token2", "base", "color", {
          type: "keyword",
          value: "red",
        }),
        createStyleDecl("token3", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
        createStyleDecl("token4", "base", "color", {
          type: "keyword",
          value: "green",
        }),
      ],
    });

    expect(duplicates.size).toBe(4);
    expect(duplicates.get("token1")).toEqual(["token2"]);
    expect(duplicates.get("token2")).toEqual(["token1"]);
    expect(duplicates.get("token3")).toEqual(["token4"]);
    expect(duplicates.get("token4")).toEqual(["token3"]);
  });

  test("finds multiple groups of duplicates", () => {
    const duplicates = findDuplicates({
      styleSources: [
        { type: "token", id: "token1", name: "Red 1" },
        { type: "token", id: "token2", name: "Red 2" },
        { type: "token", id: "token3", name: "Blue 1" },
        { type: "token", id: "token4", name: "Blue 2" },
        { type: "token", id: "token5", name: "Blue 3" },
      ],
      styles: [
        createStyleDecl("token1", "base", "color", {
          type: "keyword",
          value: "red",
        }),
        createStyleDecl("token2", "base", "color", {
          type: "keyword",
          value: "red",
        }),
        createStyleDecl("token3", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
        createStyleDecl("token4", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
        createStyleDecl("token5", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
      ],
    });

    expect(duplicates.size).toBe(5);
    expect(duplicates.get("token1")).toEqual(["token2"]);
    expect(duplicates.get("token2")).toEqual(["token1"]);
    expect(duplicates.get("token3")).toEqual(["token4", "token5"]);
    expect(duplicates.get("token4")).toEqual(["token3", "token5"]);
    expect(duplicates.get("token5")).toEqual(["token3", "token4"]);
  });

  test("returns empty map when no duplicates exist", () => {
    const duplicates = findDuplicates({
      styleSources: [
        { type: "token", id: "token1", name: "Red" },
        { type: "token", id: "token2", name: "Blue" },
      ],
      styles: [
        createStyleDecl("token1", "base", "color", {
          type: "keyword",
          value: "red",
        }),
        createStyleDecl("token2", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
      ],
    });

    expect(duplicates.size).toBe(0);
  });

  test("compares tokens across breakpoints and states", () => {
    const duplicates = findDuplicates({
      breakpoints: [
        { id: "base", label: "base" },
        { id: "tablet", label: "tablet", minWidth: 768 },
      ],
      styleSources: [
        { type: "token", id: "token1", name: "Token 1" },
        { type: "token", id: "token2", name: "Token 2" },
      ],
      styles: [
        createStyleDecl("token1", "base", "color", {
          type: "keyword",
          value: "red",
        }),
        {
          ...createStyleDecl("token1", "tablet", "color", {
            type: "keyword",
            value: "blue",
          }),
          state: ":hover",
        },
        createStyleDecl("token2", "base", "color", {
          type: "keyword",
          value: "red",
        }),
        {
          ...createStyleDecl("token2", "tablet", "color", {
            type: "keyword",
            value: "blue",
          }),
          state: ":hover",
        },
      ],
    });

    expect(duplicates.size).toBe(2);
    expect(duplicates.get("token1")).toEqual(["token2"]);
    expect(duplicates.get("token2")).toEqual(["token1"]);
  });

  test("ignores local style sources", () => {
    const duplicates = findDuplicates({
      styleSources: [
        { type: "local", id: "local1" },
        { type: "local", id: "local2" },
      ],
      styles: [
        createStyleDecl("local1", "base", "color", {
          type: "keyword",
          value: "red",
        }),
        createStyleDecl("local2", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
    });

    expect(duplicates.size).toBe(0);
  });

  test("handles tokens with no styles", () => {
    const duplicates = findDuplicates({
      styleSources: [
        { type: "token", id: "token1", name: "Empty 1" },
        { type: "token", id: "token2", name: "Empty 2" },
        { type: "token", id: "token3", name: "With Styles" },
      ],
      styles: [
        createStyleDecl("token3", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
    });

    // Empty tokens should be considered duplicates of each other
    expect(duplicates.size).toBe(2);
    expect(duplicates.get("token1")).toEqual(["token2"]);
    expect(duplicates.get("token2")).toEqual(["token1"]);
    expect(duplicates.has("token3")).toBe(false);
  });
});
