import { enableMapSet } from "immer";
import { describe, test, expect } from "vitest";
import type {
  Breakpoint,
  StyleDecl,
  StyleSource,
  StyleSources,
  StyleSourceSelection,
  StyleSourceSelections,
  Styles,
} from "@webstudio-is/sdk";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-engine";
import {
  getStyleSourceStylesSignature,
  insertStyleSources,
  insertTokenStyleSources,
  insertPortalLocalStyleSources,
  insertLocalStyleSourcesWithNewIds,
  deleteStyleSourceMutable,
  findUnusedTokens,
  deleteStyleSourcesMutable,
  validateStyleSourceName,
  validateAndRenameStyleSource,
  renameStyleSourceMutable,
  toggleStyleSourceLockMutable,
  isStyleSourceLocked,
  deleteLocalStyleSourcesMutable,
  collectStyleSourcesFromInstances,
  findDuplicateTokens,
  findTokenWithMatchingStyles,
  detectTokenConflicts,
  getLocalStyleSourceId,
  getStyleSourceInsertionIndex,
  createStyleSourceSelectionAddPlan,
  createStyleSourceSelectionAddPatch,
  createStyleSourceSelectionAttachPayload,
  createStyleSourceSelectionDetachPayload,
  createStyleSourceSelectionRemovePatch,
  createStyleSourceSelectionRemovePlan,
  addStyleSourceToInstanceMutable,
  removeStyleSourceFromInstanceMutable,
  createDesignTokenExtractionPayload,
  createDesignTokenCreatePayload,
  createDesignTokenStyleDeletePayload,
  createDesignTokenStyleUpdatePayload,
  createStyleDeclarationDeletePayload,
  createStyleDeclarationUpdatePayload,
  createStyleValueReplacementPayload,
  createLocalStyleSourcePatchPlan,
  createLocalStyleSourcePlan,
  createLocalStyleSourceClonePlan,
  getLocalStyleSourceIdWithCreated,
  getOrCreateLocalStyleSourceIdMutable,
  createDesignTokenStyleInputs,
  createStyleDeclFromInput,
  createStyleDecl as createStyleDeclValue,
  designTokenCreateInput,
  deleteStyleDeclMutable,
  getStyleDeclKeyFromInput,
  createTokenStyleSource,
  findDesignToken,
  setStyleDeclMutable,
  styleDeleteInput,
  styleReplaceInput,
  styleUpdateInput,
  updateStyleDecl,
  serializeDesignTokens,
} from "./style-source-utils";

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

const baseBreakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
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

describe("serializeDesignTokens", () => {
  test("filters, sorts, includes styles, and counts usage when requested", () => {
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
      tokens: [
        {
          id: "primary",
          name: "Primary",
          styles: { color: { type: "keyword", value: "red" } },
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
  test("creates style add patches for local style sources", () => {
    const { payload, styleKeys, missingLocalStyleSourceInstanceIds } =
      createStyleDeclarationUpdatePayload({
        styleSources: sources([local("local")]),
        styleSourceSelections: [{ instanceId: "box", values: ["local"] }],
        styles: [],
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

  test("replaces repeated style keys within the same batch", () => {
    const { payload, styleKeys } = createStyleDeclarationUpdatePayload({
      styleSources: sources([local("local")]),
      styleSourceSelections: [{ instanceId: "box", values: ["local"] }],
      styles: [],
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
              value: "red",
            }),
          },
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
    expect(styleKeys).toEqual(["local:base:color:", "local:base:color:"]);
  });
});

describe("createStyleDeclarationDeletePayload", () => {
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

describe("getStyleSourceStylesSignature", () => {
  const getSignature = (
    styleSourceId: string,
    styles: StyleDecl[],
    breakpoints = baseBreakpoints,
    mergedBreakpointIds = new Map<string, string>()
  ) =>
    getStyleSourceStylesSignature(
      styleSourceId,
      styles,
      breakpoints,
      mergedBreakpointIds
    );

  test("generates consistent signature for token styles", () => {
    const styles: StyleDecl[] = [
      createStyleDecl("token1", "base", "color", {
        type: "keyword",
        value: "red",
      }),
      createStyleDecl("token1", "base", "fontSize", {
        type: "unit",
        value: 16,
        unit: "px",
      }),
    ];

    const signature = getSignature("token1", styles);

    expect(signature).toBeTruthy();
    expect(typeof signature).toBe("string");
  });

  test("generates same signature for same styles in different order", () => {
    const styles1: StyleDecl[] = [
      createStyleDecl("token1", "base", "color", {
        type: "keyword",
        value: "red",
      }),
      createStyleDecl("token1", "base", "fontSize", {
        type: "unit",
        value: 16,
        unit: "px",
      }),
    ];
    const styles2: StyleDecl[] = [
      createStyleDecl("token1", "base", "fontSize", {
        type: "unit",
        value: 16,
        unit: "px",
      }),
      createStyleDecl("token1", "base", "color", {
        type: "keyword",
        value: "red",
      }),
    ];

    const signature1 = getSignature("token1", styles1);
    const signature2 = getSignature("token1", styles2);

    expect(signature1).toBe(signature2);
  });

  test("generates different signature for different styles", () => {
    const styles1: StyleDecl[] = [
      createStyleDecl("token1", "base", "color", {
        type: "keyword",
        value: "red",
      }),
    ];
    const styles2: StyleDecl[] = [
      createStyleDecl("token2", "base", "color", {
        type: "keyword",
        value: "blue",
      }),
    ];

    const signature1 = getSignature("token1", styles1);
    const signature2 = getSignature("token2", styles2);

    expect(signature1).not.toBe(signature2);
  });

  test("handles different breakpoints correctly", () => {
    const breakpoints = toMap<Breakpoint>([
      { id: "base", label: "base" },
      { id: "tablet", label: "tablet", minWidth: 768 },
    ]);
    const styles1: StyleDecl[] = [
      createStyleDecl("token1", "base", "color", {
        type: "keyword",
        value: "red",
      }),
    ];
    const styles2: StyleDecl[] = [
      createStyleDecl("token2", "tablet", "color", {
        type: "keyword",
        value: "red",
      }),
    ];

    const signature1 = getSignature("token1", styles1, breakpoints);
    const signature2 = getSignature("token2", styles2, breakpoints);

    expect(signature1).not.toBe(signature2);
  });

  test("handles pseudo states correctly", () => {
    const styles1: StyleDecl[] = [
      {
        styleSourceId: "token1",
        breakpointId: "base",
        property: "color" as StyleProperty,
        value: { type: "keyword", value: "red" },
      },
    ];
    const styles2: StyleDecl[] = [
      {
        styleSourceId: "token2",
        breakpointId: "base",
        property: "color" as StyleProperty,
        state: ":hover",
        value: { type: "keyword", value: "red" },
      },
    ];

    const signature1 = getSignature("token1", styles1);
    const signature2 = getSignature("token2", styles2);

    expect(signature1).not.toBe(signature2);
  });

  test("handles merged breakpoints correctly", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "existing", label: "base" }]);
    const mergedBreakpointIds = new Map([["fragment", "existing"]]);
    const styles1: StyleDecl[] = [
      createStyleDecl("token1", "existing", "color", {
        type: "keyword",
        value: "red",
      }),
    ];
    const styles2: StyleDecl[] = [
      createStyleDecl("token2", "fragment", "color", {
        type: "keyword",
        value: "red",
      }),
    ];

    const signature1 = getSignature("token1", styles1, breakpoints);
    const signature2 = getSignature(
      "token2",
      styles2,
      breakpoints,
      mergedBreakpointIds
    );

    // Should be the same because fragment breakpoint maps to existing
    expect(signature1).toBe(signature2);
  });

  test("handles complex multi-property multi-breakpoint styles", () => {
    const breakpoints = toMap<Breakpoint>([
      { id: "base", label: "base" },
      { id: "tablet", label: "tablet", minWidth: 768 },
      { id: "desktop", label: "desktop", minWidth: 1200 },
    ]);
    const styles1: StyleDecl[] = [
      createStyleDecl("token1", "base", "color", {
        type: "keyword",
        value: "red",
      }),
      createStyleDecl("token1", "tablet", "color", {
        type: "keyword",
        value: "blue",
      }),
      createStyleDecl("token1", "desktop", "fontSize", {
        type: "unit",
        value: 20,
        unit: "px",
      }),
    ];
    // Same styles but in different order
    const styles2: StyleDecl[] = [
      createStyleDecl("token2", "desktop", "fontSize", {
        type: "unit",
        value: 20,
        unit: "px",
      }),
      createStyleDecl("token2", "base", "color", {
        type: "keyword",
        value: "red",
      }),
      createStyleDecl("token2", "tablet", "color", {
        type: "keyword",
        value: "blue",
      }),
    ];

    const signature1 = getSignature("token1", styles1, breakpoints);
    const signature2 = getSignature("token2", styles2, breakpoints);

    expect(signature1).toBe(signature2);
  });
});

describe("insertStyleSources", () => {
  const insertTokenStyles = ({
    existingStyleSources,
    existingStyles,
    fragmentStyleSources,
    fragmentStyles,
    conflictResolution,
  }: {
    existingStyleSources: StyleSource[];
    existingStyles: StyleDecl[];
    fragmentStyleSources: StyleSource[];
    fragmentStyles: StyleDecl[];
    conflictResolution?: Parameters<
      typeof insertStyleSources
    >[0]["conflictResolution"];
  }) =>
    insertStyleSources({
      fragmentStyleSources,
      fragmentStyles,
      existingStyleSources: toMap(existingStyleSources),
      existingStyles: createStyleDeclMap(existingStyles),
      breakpoints: baseBreakpoints,
      mergedBreakpointIds: new Map(),
      conflictResolution,
    });

  // Case 2: Same styles AND same name -> reuse existing token
  test("token with same styles and same name reuses existing token", () => {
    const { styleSourceIdMap, updatedStyleSources } = insertTokenStyles({
      existingStyleSources: [
        { id: "existingToken", type: "token", name: "primaryColor" },
      ],
      existingStyles: [
        createStyleDecl("existingToken", "base", "color", {
          type: "keyword",
          value: "red",
        }),
        createStyleDecl("existingToken", "base", "fontSize", {
          type: "unit",
          value: 16,
          unit: "px",
        }),
      ],
      fragmentStyleSources: [
        { id: "newToken", type: "token", name: "primaryColor" },
      ],
      fragmentStyles: [
        createStyleDecl("newToken", "base", "color", {
          type: "keyword",
          value: "red",
        }),
        createStyleDecl("newToken", "base", "fontSize", {
          type: "unit",
          value: 16,
          unit: "px",
        }),
      ],
    });

    // Should reuse existing token, not create a new one
    expect(Array.from(updatedStyleSources.values())).toEqual([
      { id: "existingToken", type: "token", name: "primaryColor" },
    ]);
    // Should map newToken -> existingToken
    expect(styleSourceIdMap.get("newToken")).toBe("existingToken");
  });

  // Case 3: Same styles but different name -> insert new token with original name
  test("token with same styles but different name inserts new token", () => {
    const { styleSourceIds, styleSourceIdMap, updatedStyleSources } =
      insertTokenStyles({
        existingStyleSources: [
          { id: "token1", type: "token", name: "primaryColor" },
        ],
        existingStyles: [
          createStyleDecl("token1", "base", "color", {
            type: "keyword",
            value: "red",
          }),
        ],
        fragmentStyleSources: [
          { id: "token2", type: "token", name: "accentColor" },
        ],
        fragmentStyles: [
          createStyleDecl("token2", "base", "color", {
            type: "keyword",
            value: "red",
          }),
        ],
      });

    // Should insert new token with its original name
    const tokens = Array.from(updatedStyleSources.values());
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toEqual({
      id: "token1",
      type: "token",
      name: "primaryColor",
    });
    expect(tokens[1]).toMatchObject({ type: "token", name: "accentColor" });
    expect(tokens[1].id).not.toBe("token2"); // Should have new ID
    expect(styleSourceIds.has("token2")).toBe(true);
    expect(styleSourceIdMap.get("token2")).toBe(tokens[1].id);
  });

  // Case 4: Different styles but same name -> add counter suffix
  test("token with different styles but same name adds counter suffix", () => {
    const { styleSourceIds, styleSourceIdMap, updatedStyleSources } =
      insertTokenStyles({
        existingStyleSources: [
          { id: "token1", type: "token", name: "myToken" },
        ],
        existingStyles: [
          createStyleDecl("token1", "base", "color", {
            type: "keyword",
            value: "blue",
          }),
        ],
        fragmentStyleSources: [
          { id: "token2", type: "token", name: "myToken" },
        ],
        fragmentStyles: [
          createStyleDecl("token2", "base", "color", {
            type: "keyword",
            value: "red",
          }),
        ],
      });

    // Should add counter suffix to the new token
    const tokens = Array.from(updatedStyleSources.values());
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toEqual({ id: "token1", type: "token", name: "myToken" });
    expect(tokens[1]).toMatchObject({ type: "token", name: "myToken-1" });
    expect(tokens[1].id).not.toBe("token2"); // Should have new ID
    expect(styleSourceIds.has("token2")).toBe(true);
    expect(styleSourceIdMap.get("token2")).toBe(tokens[1].id);
  });

  // Case 4b: Multiple counter suffixes
  test("token with name conflict increments counter correctly", () => {
    const { updatedStyleSources } = insertTokenStyles({
      existingStyleSources: [
        { id: "token1", type: "token", name: "myToken" },
        { id: "token2", type: "token", name: "myToken-1" },
        { id: "token3", type: "token", name: "myToken-2" },
      ],
      existingStyles: [
        createStyleDecl("token1", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
        createStyleDecl("token2", "base", "color", {
          type: "keyword",
          value: "green",
        }),
        createStyleDecl("token3", "base", "color", {
          type: "keyword",
          value: "yellow",
        }),
      ],
      fragmentStyleSources: [{ id: "token4", type: "token", name: "myToken" }],
      fragmentStyles: [
        createStyleDecl("token4", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
    });

    // Should use counter 3
    const tokens = Array.from(updatedStyleSources.values());
    expect(tokens).toHaveLength(4);
    expect(tokens[0]).toEqual({ id: "token1", type: "token", name: "myToken" });
    expect(tokens[1]).toEqual({
      id: "token2",
      type: "token",
      name: "myToken-1",
    });
    expect(tokens[2]).toEqual({
      id: "token3",
      type: "token",
      name: "myToken-2",
    });
    expect(tokens[3]).toMatchObject({ type: "token", name: "myToken-3" });
    expect(tokens[3].id).not.toBe("token4"); // Should have new ID
  });

  // Case 6: Different styles and different name -> insert as-is
  test("token with different styles and different name inserts normally", () => {
    const { styleSourceIds, styleSourceIdMap, updatedStyleSources } =
      insertTokenStyles({
        existingStyleSources: [
          { id: "token1", type: "token", name: "primaryColor" },
        ],
        existingStyles: [
          createStyleDecl("token1", "base", "color", {
            type: "keyword",
            value: "blue",
          }),
        ],
        fragmentStyleSources: [
          { id: "token2", type: "token", name: "secondaryColor" },
        ],
        fragmentStyles: [
          createStyleDecl("token2", "base", "color", {
            type: "keyword",
            value: "red",
          }),
        ],
      });

    // Should insert new token normally
    const tokens = Array.from(updatedStyleSources.values());
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toEqual({
      id: "token1",
      type: "token",
      name: "primaryColor",
    });
    expect(tokens[1]).toMatchObject({ type: "token", name: "secondaryColor" });
    expect(tokens[1].id).not.toBe("token2"); // Should have new ID
    expect(styleSourceIds.has("token2")).toBe(true);
    expect(styleSourceIdMap.get("token2")).toBe(tokens[1].id);
  });

  // Case 3 safeguard: Same styles but different name gets suffix when name conflicts
  test("token with same styles but different name adds suffix when name already exists", () => {
    const { updatedStyleSources } = insertTokenStyles({
      existingStyleSources: [
        { id: "token1", type: "token", name: "primaryColor" },
        { id: "token2", type: "token", name: "accentColor" },
      ],
      existingStyles: [
        createStyleDecl("token1", "base", "color", {
          type: "keyword",
          value: "red",
        }),
        createStyleDecl("token2", "base", "fontSize", {
          type: "unit",
          value: 16,
          unit: "px",
        }),
      ],
      fragmentStyleSources: [
        { id: "token3", type: "token", name: "accentColor" },
      ],
      fragmentStyles: [
        createStyleDecl("token3", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
    });

    // Should add counter suffix to prevent duplicate name
    const tokens = Array.from(updatedStyleSources.values());
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toEqual({
      id: "token1",
      type: "token",
      name: "primaryColor",
    });
    expect(tokens[1]).toEqual({
      id: "token2",
      type: "token",
      name: "accentColor",
    });
    expect(tokens[2]).toMatchObject({ type: "token", name: "accentColor-1" });
    expect(tokens[2].id).not.toBe("token3"); // Should have new ID
  });

  // Case 6 safeguard: Different styles and different name gets suffix when name conflicts
  test("token with different styles and name adds suffix when name already exists", () => {
    const { updatedStyleSources } = insertTokenStyles({
      existingStyleSources: [
        { id: "token1", type: "token", name: "primaryColor" },
        { id: "token2", type: "token", name: "secondaryColor" },
      ],
      existingStyles: [
        createStyleDecl("token1", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
        createStyleDecl("token2", "base", "color", {
          type: "keyword",
          value: "green",
        }),
      ],
      fragmentStyleSources: [
        { id: "token3", type: "token", name: "secondaryColor" },
      ],
      fragmentStyles: [
        createStyleDecl("token3", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
    });

    // Should add counter suffix to prevent duplicate name
    const tokens = Array.from(updatedStyleSources.values());
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toEqual({
      id: "token1",
      type: "token",
      name: "primaryColor",
    });
    expect(tokens[1]).toEqual({
      id: "token2",
      type: "token",
      name: "secondaryColor",
    });
    expect(tokens[2]).toMatchObject({
      type: "token",
      name: "secondaryColor-1",
    });
    expect(tokens[2].id).not.toBe("token3"); // Should have new ID
  });

  // Test that existing token with same styles but different name stays untouched
  test("existing token with matching styles but different name stays untouched when inserting new token", () => {
    const { updatedStyleSources } = insertTokenStyles({
      existingStyleSources: [
        { id: "existingToken", type: "token", name: "primaryColor" },
      ],
      existingStyles: [
        createStyleDecl("existingToken", "base", "color", {
          type: "keyword",
          value: "red",
        }),
        createStyleDecl("existingToken", "base", "fontSize", {
          type: "unit",
          value: 16,
          unit: "px",
        }),
      ],
      fragmentStyleSources: [
        { id: "newToken", type: "token", name: "accentColor" },
      ],
      fragmentStyles: [
        createStyleDecl("newToken", "base", "color", {
          type: "keyword",
          value: "red",
        }),
        createStyleDecl("newToken", "base", "fontSize", {
          type: "unit",
          value: 16,
          unit: "px",
        }),
      ],
    });

    // Should insert new token with its own name, leaving existing one untouched
    const tokens = Array.from(updatedStyleSources.values());
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toEqual({
      id: "existingToken",
      type: "token",
      name: "primaryColor",
    });
    expect(tokens[1]).toMatchObject({ type: "token", name: "accentColor" });
    expect(tokens[1].id).not.toBe("newToken"); // Should have new ID
  });

  // Critical test: inserting base name when suffixed version exists
  test("inserting token 'bbb' when 'bbb-1' with same styles exists inserts both tokens", () => {
    const { styleSourceIdMap, updatedStyleSources } = insertTokenStyles({
      existingStyleSources: [
        { id: "existingToken", type: "token", name: "bbb-1" },
      ],
      existingStyles: [
        createStyleDecl("existingToken", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
      ],
      fragmentStyleSources: [{ id: "newToken", type: "token", name: "bbb" }],
      fragmentStyles: [
        createStyleDecl("newToken", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
      ],
    });

    // Both tokens should exist
    const tokens = Array.from(updatedStyleSources.values());
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toEqual({
      id: "existingToken",
      type: "token",
      name: "bbb-1",
    });
    expect(tokens[1]).toMatchObject({ type: "token", name: "bbb" }); // Different name, so inserted as-is
    expect(tokens[1].id).not.toBe("newToken"); // Should have new ID
    expect(styleSourceIdMap.get("newToken")).toBe(tokens[1].id);
  });

  // Test merge conflict resolution
  test('token with different styles and same name merges when conflictResolution="merge"', () => {
    const { styleSourceIds, styleSourceIdMap, updatedStyleSources } =
      insertTokenStyles({
        existingStyleSources: [
          { id: "existingToken", type: "token", name: "primaryColor" },
        ],
        existingStyles: [
          createStyleDecl("existingToken", "base", "color", {
            type: "keyword",
            value: "blue",
          }),
          createStyleDecl("existingToken", "base", "fontSize", {
            type: "unit",
            value: 16,
            unit: "px",
          }),
        ],
        fragmentStyleSources: [
          { id: "newToken", type: "token", name: "primaryColor" },
        ],
        fragmentStyles: [
          createStyleDecl("newToken", "base", "color", {
            type: "keyword",
            value: "red",
          }),
          createStyleDecl("newToken", "base", "fontWeight", {
            type: "keyword",
            value: "bold",
          }),
        ],
        conflictResolution: "merge",
      });

    // Should keep existing token (no new token created)
    const tokens = Array.from(updatedStyleSources.values());
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toEqual({
      id: "existingToken",
      type: "token",
      name: "primaryColor",
    });

    // Should map the fragment token to the existing token
    expect(styleSourceIdMap.get("newToken")).toBe("existingToken");

    // Should mark the fragment token for style insertion
    // This tells insertWebstudioFragment to insert these styles, which will:
    // - Override existing "color" from blue to red
    // - Keep existing "fontSize" at 16px
    // - Add new "fontWeight" bold
    expect(styleSourceIds.has("newToken")).toBe(true);
  });
});

// Tests for insertPortalLocalStyleSources

describe("insertPortalLocalStyleSources", () => {
  test("inserts local style sources and styles for portal content", () => {
    const fragmentStyleSources: StyleSource[] = [
      { type: "local", id: "local1" },
      { type: "token", id: "token1", name: "myToken" },
    ];
    const fragmentStyleSourceSelections: StyleSourceSelection[] = [
      { instanceId: "instance1", values: ["local1", "token1"] },
      { instanceId: "instance2", values: ["local1"] },
    ];
    const fragmentStyles: StyleDecl[] = [
      {
        breakpointId: "bp1",
        styleSourceId: "local1",
        property: "width",
        value: { type: "unit", value: 100, unit: "px" },
      },
      {
        breakpointId: "bp2",
        styleSourceId: "local1",
        property: "height",
        value: { type: "unit", value: 50, unit: "px" },
      },
    ];
    const instanceIds = new Set(["instance1"]);
    const styleSources: StyleSources = new Map();
    const styleSourceSelections: StyleSourceSelections = new Map();
    const styles: Styles = new Map();
    const mergedBreakpointIds = new Map([["bp2", "bp2-merged"]]);

    insertPortalLocalStyleSources({
      fragmentStyleSources,
      fragmentStyleSourceSelections,
      fragmentStyles,
      instanceIds,
      styleSources,
      styleSourceSelections,
      styles,
      mergedBreakpointIds,
    });

    // Should only insert for instance1 (in instanceIds set)
    expect(styleSourceSelections.has("instance1")).toBe(true);
    expect(styleSourceSelections.has("instance2")).toBe(false);

    // Should insert local style source
    expect(styleSources.get("local1")).toEqual({ type: "local", id: "local1" });

    // Should insert styles with merged breakpoint IDs
    expect(styles.size).toBe(2);
    const stylesArray = Array.from(styles.values());
    expect(stylesArray).toContainEqual({
      breakpointId: "bp1",
      styleSourceId: "local1",
      property: "width",
      value: { type: "unit", value: 100, unit: "px" },
    });
    expect(stylesArray).toContainEqual({
      breakpointId: "bp2-merged",
      styleSourceId: "local1",
      property: "height",
      value: { type: "unit", value: 50, unit: "px" },
    });
  });

  test("preserves original IDs for portal content", () => {
    const fragmentStyleSources: StyleSource[] = [
      { type: "local", id: "portal-local-123" },
    ];
    const fragmentStyleSourceSelections: StyleSourceSelection[] = [
      { instanceId: "portal-instance", values: ["portal-local-123"] },
    ];
    const fragmentStyles: StyleDecl[] = [
      {
        breakpointId: "bp1",
        styleSourceId: "portal-local-123",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
    ];
    const instanceIds = new Set(["portal-instance"]);
    const styleSources: StyleSources = new Map();
    const styleSourceSelections: StyleSourceSelections = new Map();
    const styles: Styles = new Map();
    const mergedBreakpointIds = new Map();

    insertPortalLocalStyleSources({
      fragmentStyleSources,
      fragmentStyleSourceSelections,
      fragmentStyles,
      instanceIds,
      styleSources,
      styleSourceSelections,
      styles,
      mergedBreakpointIds,
    });

    // IDs should be preserved exactly
    expect(styleSources.get("portal-local-123")).toEqual({
      type: "local",
      id: "portal-local-123",
    });
    expect(styleSourceSelections.get("portal-instance")).toEqual({
      instanceId: "portal-instance",
      values: ["portal-local-123"],
    });
  });

  test("skips instances not in instanceIds set", () => {
    const fragmentStyleSources: StyleSource[] = [
      { type: "local", id: "local1" },
    ];
    const fragmentStyleSourceSelections: StyleSourceSelection[] = [
      { instanceId: "included", values: ["local1"] },
      { instanceId: "excluded", values: ["local1"] },
    ];
    const fragmentStyles: StyleDecl[] = [
      {
        breakpointId: "bp1",
        styleSourceId: "local1",
        property: "width",
        value: { type: "unit", value: 100, unit: "px" },
      },
    ];
    const instanceIds = new Set(["included"]);
    const styleSources: StyleSources = new Map();
    const styleSourceSelections: StyleSourceSelections = new Map();
    const styles: Styles = new Map();
    const mergedBreakpointIds = new Map();

    insertPortalLocalStyleSources({
      fragmentStyleSources,
      fragmentStyleSourceSelections,
      fragmentStyles,
      instanceIds,
      styleSources,
      styleSourceSelections,
      styles,
      mergedBreakpointIds,
    });

    expect(styleSourceSelections.has("included")).toBe(true);
    expect(styleSourceSelections.has("excluded")).toBe(false);
  });
});

// Tests for insertLocalStyleSourcesWithNewIds

describe("insertLocalStyleSourcesWithNewIds", () => {
  test("generates new IDs for local style sources", () => {
    const fragmentStyleSources: StyleSource[] = [
      { type: "local", id: "old-local-1" },
    ];
    const fragmentStyleSourceSelections: StyleSourceSelection[] = [
      { instanceId: "old-instance", values: ["old-local-1"] },
    ];
    const fragmentStyles: StyleDecl[] = [
      {
        breakpointId: "bp1",
        styleSourceId: "old-local-1",
        property: "marginTop" as StyleProperty,
        value: { type: "unit", value: 10, unit: "px" },
      },
    ];
    const fragmentInstanceIds = new Set(["old-instance"]);
    const newInstanceIds = new Map([["old-instance", "new-instance"]]);
    const styleSourceIdMap = new Map();
    const styleSources: StyleSources = new Map();
    const styleSourceSelections: StyleSourceSelections = new Map();
    const styles: Styles = new Map();
    const mergedBreakpointIds = new Map();

    insertLocalStyleSourcesWithNewIds({
      fragmentStyleSources,
      fragmentStyleSourceSelections,
      fragmentStyles,
      fragmentInstanceIds,
      newInstanceIds,
      styleSourceIdMap,
      styleSources,
      styleSourceSelections,
      styles,
      mergedBreakpointIds,
    });

    // Should create new local style source with different ID
    expect(styleSources.size).toBe(1);
    const newLocalStyleSource = Array.from(styleSources.values())[0];
    expect(newLocalStyleSource.type).toBe("local");
    expect(newLocalStyleSource.id).not.toBe("old-local-1");

    // Should map to new instance ID
    expect(styleSourceSelections.has("new-instance")).toBe(true);
    expect(styleSourceSelections.has("old-instance")).toBe(false);

    // Should create style with new style source ID
    expect(styles.size).toBe(1);
    const newStyle = Array.from(styles.values())[0];
    expect(newStyle.styleSourceId).toBe(newLocalStyleSource.id);
  });

  test("merges local styles into existing ROOT_INSTANCE_ID local source", async () => {
    const { ROOT_INSTANCE_ID } = await import("@webstudio-is/sdk");

    const fragmentStyleSources: StyleSource[] = [
      { type: "local", id: "fragment-local" },
    ];
    const fragmentStyleSourceSelections: StyleSourceSelection[] = [
      { instanceId: ROOT_INSTANCE_ID, values: ["fragment-local"] },
    ];
    const fragmentStyles: StyleDecl[] = [
      {
        breakpointId: "bp1",
        styleSourceId: "fragment-local",
        property: "fontFamily",
        value: { type: "fontFamily", value: ["Arial"] },
      },
    ];
    const fragmentInstanceIds = new Set([ROOT_INSTANCE_ID]);
    const newInstanceIds = new Map();
    const styleSourceIdMap = new Map();

    // Existing ROOT local style source
    const existingRootLocal: StyleSource = {
      type: "local",
      id: "existing-root-local",
    };
    const styleSources: StyleSources = new Map([
      ["existing-root-local", existingRootLocal],
    ]);
    const styleSourceSelections: StyleSourceSelections = new Map([
      [
        ROOT_INSTANCE_ID,
        { instanceId: ROOT_INSTANCE_ID, values: ["existing-root-local"] },
      ],
    ]);
    const styles: Styles = new Map();
    const mergedBreakpointIds = new Map();

    insertLocalStyleSourcesWithNewIds({
      fragmentStyleSources,
      fragmentStyleSourceSelections,
      fragmentStyles,
      fragmentInstanceIds,
      newInstanceIds,
      styleSourceIdMap,
      styleSources,
      styleSourceSelections,
      styles,
      mergedBreakpointIds,
    });

    // Should reuse existing ROOT local style source, not create new one
    expect(styleSources.size).toBe(1);
    expect(styleSources.get("existing-root-local")).toBe(existingRootLocal);

    // Style should use existing local style source ID
    expect(styles.size).toBe(1);
    const style = Array.from(styles.values())[0];
    expect(style.styleSourceId).toBe("existing-root-local");
  });

  test("creates new local source for non-ROOT instances even if local exists", () => {
    const fragmentStyleSources: StyleSource[] = [
      { type: "local", id: "fragment-local" },
    ];
    const fragmentStyleSourceSelections: StyleSourceSelection[] = [
      { instanceId: "regular-instance", values: ["fragment-local"] },
    ];
    const fragmentStyles: StyleDecl[] = [
      {
        breakpointId: "bp1",
        styleSourceId: "fragment-local",
        property: "paddingTop" as StyleProperty,
        value: { type: "unit", value: 20, unit: "px" },
      },
    ];
    const fragmentInstanceIds = new Set(["regular-instance"]);
    const newInstanceIds = new Map();
    const styleSourceIdMap = new Map();

    // Existing local style source for this instance
    const existingLocal: StyleSource = { type: "local", id: "existing-local" };
    const styleSources: StyleSources = new Map([
      ["existing-local", existingLocal],
    ]);
    const styleSourceSelections: StyleSourceSelections = new Map([
      [
        "regular-instance",
        { instanceId: "regular-instance", values: ["existing-local"] },
      ],
    ]);
    const styles: Styles = new Map();
    const mergedBreakpointIds = new Map();

    insertLocalStyleSourcesWithNewIds({
      fragmentStyleSources,
      fragmentStyleSourceSelections,
      fragmentStyles,
      fragmentInstanceIds,
      newInstanceIds,
      styleSourceIdMap,
      styleSources,
      styleSourceSelections,
      styles,
      mergedBreakpointIds,
    });

    // Should create NEW local style source (not merge)
    expect(styleSources.size).toBe(2);
    const newLocalId = Array.from(styleSources.keys()).find(
      (id) => id !== "existing-local"
    );
    expect(newLocalId).toBeDefined();

    // Style should use new local style source ID
    const style = Array.from(styles.values())[0];
    expect(style.styleSourceId).toBe(newLocalId);
  });

  test("handles token remapping in styleSourceIdMap", () => {
    const fragmentStyleSources: StyleSource[] = [
      { type: "local", id: "local1" },
      { type: "token", id: "old-token", name: "oldToken" },
    ];
    const fragmentStyleSourceSelections: StyleSourceSelection[] = [
      { instanceId: "instance1", values: ["local1", "old-token"] },
    ];
    const fragmentStyles: StyleDecl[] = [
      {
        breakpointId: "bp1",
        styleSourceId: "local1",
        property: "color",
        value: { type: "keyword", value: "blue" },
      },
    ];
    const fragmentInstanceIds = new Set(["instance1"]);
    const newInstanceIds = new Map();

    // Token was already mapped to existing token
    const styleSourceIdMap = new Map([["old-token", "existing-token"]]);

    const styleSources: StyleSources = new Map();
    const styleSourceSelections: StyleSourceSelections = new Map();
    const styles: Styles = new Map();
    const mergedBreakpointIds = new Map();

    insertLocalStyleSourcesWithNewIds({
      fragmentStyleSources,
      fragmentStyleSourceSelections,
      fragmentStyles,
      fragmentInstanceIds,
      newInstanceIds,
      styleSourceIdMap,
      styleSources,
      styleSourceSelections,
      styles,
      mergedBreakpointIds,
    });

    // styleSourceSelection should reference the mapped token ID
    const selection = styleSourceSelections.get("instance1");
    expect(selection?.values).toContain("existing-token");
    expect(selection?.values).not.toContain("old-token");
  });

  test("applies merged breakpoint IDs to styles", () => {
    const fragmentStyleSources: StyleSource[] = [
      { type: "local", id: "local1" },
    ];
    const fragmentStyleSourceSelections: StyleSourceSelection[] = [
      { instanceId: "instance1", values: ["local1"] },
    ];
    const fragmentStyles: StyleDecl[] = [
      {
        breakpointId: "old-bp",
        styleSourceId: "local1",
        property: "display",
        value: { type: "keyword", value: "flex" },
      },
    ];
    const fragmentInstanceIds = new Set(["instance1"]);
    const newInstanceIds = new Map();
    const styleSourceIdMap = new Map();
    const styleSources: StyleSources = new Map();
    const styleSourceSelections: StyleSourceSelections = new Map();
    const styles: Styles = new Map();
    const mergedBreakpointIds = new Map([["old-bp", "merged-bp"]]);

    insertLocalStyleSourcesWithNewIds({
      fragmentStyleSources,
      fragmentStyleSourceSelections,
      fragmentStyles,
      fragmentInstanceIds,
      newInstanceIds,
      styleSourceIdMap,
      styleSources,
      styleSourceSelections,
      styles,
      mergedBreakpointIds,
    });

    // Style should use merged breakpoint ID
    const style = Array.from(styles.values())[0];
    expect(style.breakpointId).toBe("merged-bp");
  });
});

describe("insertLocalStyleSourcesWithNewIds in content mode", () => {
  test("copies local styles for existing breakpoints and reuses token ids", () => {
    const fragmentStyleSources: StyleSource[] = [
      { type: "local", id: "fragment-local" },
      { type: "token", id: "existing-token", name: "Existing" },
    ];
    const fragmentStyleSourceSelections: StyleSourceSelection[] = [
      { instanceId: "fragment-instance", values: ["fragment-local"] },
      {
        instanceId: "fragment-instance-with-token",
        values: ["fragment-local", "existing-token"],
      },
    ];
    const fragmentStyles: StyleDecl[] = [
      createStyleDecl("fragment-local", "base", "color", {
        type: "keyword",
        value: "red",
      }),
      createStyleDecl("fragment-local", "missing", "fontSize", {
        type: "unit",
        value: 16,
        unit: "px",
      }),
    ];
    const fragmentInstanceIds = new Set([
      "fragment-instance",
      "fragment-instance-with-token",
    ]);
    const newInstanceIds = new Map([
      ["fragment-instance", "new-instance"],
      ["fragment-instance-with-token", "new-instance-with-token"],
    ]);
    const styleSources: StyleSources = new Map([
      [
        "existing-token",
        { type: "token", id: "existing-token", name: "Existing" },
      ],
    ]);
    const styleSourceSelections: StyleSourceSelections = new Map();
    const styles: Styles = new Map();
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "Base" }]);

    insertLocalStyleSourcesWithNewIds({
      fragmentStyleSources,
      fragmentStyleSourceSelections,
      fragmentStyles,
      fragmentInstanceIds,
      newInstanceIds,
      styleSources,
      styleSourceSelections,
      styles,
      breakpoints,
      contentMode: true,
    });

    const copiedLocalIds = Array.from(styleSources.keys()).filter(
      (styleSourceId) => styleSourceId !== "existing-token"
    );
    expect(copiedLocalIds).toHaveLength(1);
    const [copiedLocalId] = copiedLocalIds;
    expect(styleSources.get(copiedLocalId)).toMatchObject({ type: "local" });
    expect(styleSourceSelections.get("new-instance")).toEqual({
      instanceId: "new-instance",
      values: [copiedLocalId],
    });
    expect(styleSourceSelections.get("new-instance-with-token")).toEqual({
      instanceId: "new-instance-with-token",
      values: [copiedLocalId, "existing-token"],
    });
    expect(Array.from(styles.values())).toEqual([
      {
        ...fragmentStyles[0],
        styleSourceId: copiedLocalId,
      },
    ]);
  });

  test("skips selections with no copyable content-mode style sources", () => {
    const fragmentStyleSources: StyleSource[] = [
      { type: "local", id: "fragment-local" },
      { type: "token", id: "missing-token", name: "Missing" },
    ];
    const fragmentStyleSourceSelections: StyleSourceSelection[] = [
      { instanceId: "fragment-instance", values: ["fragment-local"] },
      { instanceId: "fragment-instance-with-token", values: ["missing-token"] },
    ];
    const fragmentStyles: StyleDecl[] = [
      createStyleDecl("fragment-local", "missing", "color", {
        type: "keyword",
        value: "red",
      }),
    ];
    const styleSources: StyleSources = new Map();
    const styleSourceSelections: StyleSourceSelections = new Map();
    const styles: Styles = new Map();

    insertLocalStyleSourcesWithNewIds({
      fragmentStyleSources,
      fragmentStyleSourceSelections,
      fragmentStyles,
      fragmentInstanceIds: new Set([
        "fragment-instance",
        "fragment-instance-with-token",
      ]),
      newInstanceIds: new Map([
        ["fragment-instance", "new-instance"],
        ["fragment-instance-with-token", "new-instance-with-token"],
      ]),
      styleSources,
      styleSourceSelections,
      styles,
      breakpoints: toMap<Breakpoint>([{ id: "base", label: "Base" }]),
      contentMode: true,
    });

    expect(styleSources).toEqual(new Map());
    expect(styleSourceSelections).toEqual(new Map());
    expect(styles).toEqual(new Map());
  });

  test("does not reuse target local style source ids", () => {
    const fragmentStyleSourceSelections: StyleSourceSelection[] = [
      { instanceId: "fragment-instance", values: ["existing-local"] },
      {
        instanceId: "fragment-instance-with-token",
        values: ["existing-token"],
      },
    ];
    const styleSources: StyleSources = new Map([
      ["existing-local", { type: "local", id: "existing-local" }],
      [
        "existing-token",
        { type: "token", id: "existing-token", name: "Existing" },
      ],
    ]);
    const styleSourceSelections: StyleSourceSelections = new Map();
    const styles: Styles = new Map();

    insertLocalStyleSourcesWithNewIds({
      fragmentStyleSources: [],
      fragmentStyleSourceSelections,
      fragmentStyles: [],
      fragmentInstanceIds: new Set([
        "fragment-instance",
        "fragment-instance-with-token",
      ]),
      newInstanceIds: new Map([
        ["fragment-instance", "new-instance"],
        ["fragment-instance-with-token", "new-instance-with-token"],
      ]),
      styleSources,
      styleSourceSelections,
      styles,
      breakpoints: toMap<Breakpoint>([{ id: "base", label: "Base" }]),
      contentMode: true,
    });

    expect(styleSourceSelections.get("new-instance")).toBeUndefined();
    expect(styleSourceSelections.get("new-instance-with-token")).toEqual({
      instanceId: "new-instance-with-token",
      values: ["existing-token"],
    });
  });

  test("copies fragment local style sources even when ids already exist in target", () => {
    const fragmentStyleSources: StyleSource[] = [
      { type: "local", id: "local" },
    ];
    const fragmentStyleSourceSelections: StyleSourceSelection[] = [
      { instanceId: "fragment-instance", values: ["local"] },
    ];
    const fragmentStyles: StyleDecl[] = [
      createStyleDecl("local", "base", "color", {
        type: "keyword",
        value: "red",
      }),
    ];
    const styleSources: StyleSources = new Map([
      ["local", { type: "local", id: "local" }],
    ]);
    const styleSourceSelections: StyleSourceSelections = new Map();
    const styles: Styles = new Map();

    insertLocalStyleSourcesWithNewIds({
      fragmentStyleSources,
      fragmentStyleSourceSelections,
      fragmentStyles,
      fragmentInstanceIds: new Set(["fragment-instance"]),
      newInstanceIds: new Map([["fragment-instance", "new-instance"]]),
      styleSources,
      styleSourceSelections,
      styles,
      breakpoints: toMap<Breakpoint>([{ id: "base", label: "Base" }]),
      contentMode: true,
    });

    const copiedLocalId = styleSourceSelections.get("new-instance")?.values[0];

    expect(copiedLocalId).toBeDefined();
    expect(copiedLocalId).not.toBe("local");
    expect(styleSources.get("local")).toEqual({ type: "local", id: "local" });
    expect(styleSources.get(copiedLocalId ?? "")).toMatchObject({
      type: "local",
    });
    expect(Array.from(styles.values())).toEqual([
      {
        ...fragmentStyles[0],
        styleSourceId: copiedLocalId,
      },
    ]);
  });
});

describe("insertTokenStyleSources", () => {
  test("inserts token sources and remaps their styles", () => {
    const breakpoints = toMap<Breakpoint>([
      { id: "base", label: "base" },
      { id: "desktop", label: "Desktop", minWidth: 1280 },
    ]);
    const styleSources: StyleSources = new Map([
      ["existing-token", { id: "existing-token", type: "token", name: "Old" }],
    ]);
    const styles: Styles = new Map();
    const fragmentStyleSources: StyleSource[] = [
      { id: "token", type: "token", name: "Primary" },
    ];
    const fragmentStyles: StyleDecl[] = [
      createStyleDecl("token", "old-desktop", "color", {
        type: "keyword",
        value: "red",
      }),
    ];

    const styleSourceIdMap = insertTokenStyleSources({
      fragmentStyleSources,
      fragmentStyles,
      styleSources,
      styles,
      breakpoints,
      mergedBreakpointIds: new Map([["old-desktop", "desktop"]]),
    });

    const newTokenId = styleSourceIdMap.get("token");
    expect(newTokenId).toBeDefined();
    expect(newTokenId).not.toBe("token");
    expect(styleSources.get(newTokenId ?? "")).toMatchObject({
      type: "token",
      name: "Primary",
    });
    expect(Array.from(styles.values())).toEqual([
      {
        ...fragmentStyles[0],
        breakpointId: "desktop",
        styleSourceId: newTokenId,
      },
    ]);
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

describe("collectStyleSourcesFromInstances", () => {
  test("collects style sources and selections from instances", () => {
    const instanceIds = new Set(["instance1", "instance2"]);
    const styleSourceSelections: StyleSourceSelections = new Map([
      ["instance1", { instanceId: "instance1", values: ["local1", "token1"] }],
      ["instance2", { instanceId: "instance2", values: ["local2"] }],
      ["instance3", { instanceId: "instance3", values: ["local3"] }],
    ]);
    const styleSources = sources([
      local("local1"),
      local("local2"),
      local("local3"),
      token("token1", "Token 1"),
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
      [
        "token1:base:backgroundColor",
        {
          breakpointId: "base",
          styleSourceId: "token1",
          property: "backgroundColor",
          value: { type: "keyword", value: "blue" },
        },
      ],
    ]);

    const result = collectStyleSourcesFromInstances({
      instanceIds,
      styleSourceSelections,
      styleSources,
      styles,
    });

    expect(result.styleSourceSelectionsArray).toHaveLength(2);
    expect(result.styleSourceSelectionsArray[0].instanceId).toBe("instance1");
    expect(result.styleSourceSelectionsArray[1].instanceId).toBe("instance2");

    expect(result.styleSourcesMap.size).toBe(3);
    expect(result.styleSourcesMap.has("local1")).toBe(true);
    expect(result.styleSourcesMap.has("local2")).toBe(true);
    expect(result.styleSourcesMap.has("token1")).toBe(true);
    expect(result.styleSourcesMap.has("local3")).toBe(false);

    expect(result.stylesArray).toHaveLength(3);
    expect(
      result.stylesArray.find((s) => s.styleSourceId === "local1")
    ).toBeDefined();
    expect(
      result.stylesArray.find((s) => s.styleSourceId === "local2")
    ).toBeDefined();
    expect(
      result.stylesArray.find((s) => s.styleSourceId === "token1")
    ).toBeDefined();
    expect(
      result.stylesArray.find((s) => s.styleSourceId === "local3")
    ).toBeUndefined();
  });

  test("returns empty arrays when instances have no style sources", () => {
    const instanceIds = new Set(["instance1", "instance2"]);
    const styleSourceSelections: StyleSourceSelections = new Map();
    const styleSources: StyleSources = new Map();
    const styles: Styles = new Map();

    const result = collectStyleSourcesFromInstances({
      instanceIds,
      styleSourceSelections,
      styleSources,
      styles,
    });

    expect(result.styleSourceSelectionsArray).toHaveLength(0);
    expect(result.styleSourcesMap.size).toBe(0);
    expect(result.stylesArray).toHaveLength(0);
  });

  test("handles missing style sources gracefully", () => {
    const instanceIds = new Set(["instance1"]);
    const styleSourceSelections: StyleSourceSelections = new Map([
      [
        "instance1",
        { instanceId: "instance1", values: ["local1", "missing-source"] },
      ],
    ]);
    const styleSources: StyleSources = new Map([["local1", local("local1")]]);
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
    ]);

    const result = collectStyleSourcesFromInstances({
      instanceIds,
      styleSourceSelections,
      styleSources,
      styles,
    });

    expect(result.styleSourceSelectionsArray).toHaveLength(1);
    expect(result.styleSourcesMap.size).toBe(1);
    expect(result.styleSourcesMap.has("local1")).toBe(true);
    expect(result.styleSourcesMap.has("missing-source")).toBe(false);
  });

  test("deduplicates style sources from multiple instances", () => {
    const instanceIds = new Set(["instance1", "instance2"]);
    const styleSourceSelections: StyleSourceSelections = new Map([
      ["instance1", { instanceId: "instance1", values: ["token1"] }],
      ["instance2", { instanceId: "instance2", values: ["token1"] }],
    ]);
    const styleSources: StyleSources = new Map([
      ["token1", token("token1", "Shared Token")],
    ]);
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
    ]);

    const result = collectStyleSourcesFromInstances({
      instanceIds,
      styleSourceSelections,
      styleSources,
      styles,
    });

    expect(result.styleSourceSelectionsArray).toHaveLength(2);
    expect(result.styleSourcesMap.size).toBe(1);
    expect(result.stylesArray).toHaveLength(1);
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

describe("findTokenWithMatchingStyles", () => {
  const breakpoints = new Map<Breakpoint["id"], Breakpoint>([
    ["base", { id: "base", label: "Base" }],
  ]);
  const findTokenMatch = ({
    tokenName,
    existingTokenName = tokenName,
    tokenStyles = [],
    existingStyles = [],
  }: {
    tokenName: string;
    existingTokenName?: string;
    tokenStyles?: StyleDecl[];
    existingStyles?: StyleDecl[];
  }) =>
    findTokenWithMatchingStyles({
      tokenName,
      tokenStyles,
      existingTokens: [
        { type: "token", id: "existing1", name: existingTokenName },
      ],
      existingStyles,
      breakpoints,
      mergedBreakpointIds: new Map(),
    });

  test("returns no conflict when token name doesn't exist", () => {
    const result = findTokenMatch({
      tokenName: "SecondaryColor",
      existingTokenName: "PrimaryColor",
    });

    expect(result.hasConflict).toBe(false);
    expect(result.matchingToken).toBeUndefined();
  });

  test("returns matching token when name and styles match", () => {
    const existingStyles: StyleDecl[] = [
      createStyleDecl("existing1", "base", "color", {
        type: "keyword",
        value: "red",
      }),
    ];
    const tokenStyles: StyleDecl[] = [
      createStyleDecl("fragment1", "base", "color", {
        type: "keyword",
        value: "red",
      }),
    ];
    const result = findTokenMatch({
      tokenName: "PrimaryColor",
      tokenStyles,
      existingStyles,
    });

    expect(result.hasConflict).toBe(false);
    expect(result.matchingToken).toBeDefined();
    expect(result.matchingToken?.id).toBe("existing1");
  });

  test("returns conflict when name matches but styles differ", () => {
    const existingStyles: StyleDecl[] = [
      createStyleDecl("existing1", "base", "color", {
        type: "keyword",
        value: "red",
      }),
    ];
    const tokenStyles: StyleDecl[] = [
      createStyleDecl("fragment1", "base", "color", {
        type: "keyword",
        value: "blue",
      }),
    ];
    const result = findTokenMatch({
      tokenName: "PrimaryColor",
      tokenStyles,
      existingStyles,
    });

    expect(result.hasConflict).toBe(true);
    expect(result.matchingToken).toBeUndefined();
  });

  test("matches token with multiple style properties", () => {
    const existingStyles: StyleDecl[] = [
      createStyleDecl("existing1", "base", "color", {
        type: "keyword",
        value: "white",
      }),
      createStyleDecl("existing1", "base", "backgroundColor", {
        type: "keyword",
        value: "blue",
      }),
      createStyleDecl("existing1", "base", "paddingTop", {
        type: "unit",
        value: 10,
        unit: "px",
      }),
    ];
    const tokenStyles: StyleDecl[] = [
      createStyleDecl("fragment1", "base", "paddingTop", {
        type: "unit",
        value: 10,
        unit: "px",
      }),
      createStyleDecl("fragment1", "base", "backgroundColor", {
        type: "keyword",
        value: "blue",
      }),
      createStyleDecl("fragment1", "base", "color", {
        type: "keyword",
        value: "white",
      }),
    ];
    const result = findTokenMatch({
      tokenName: "ButtonStyle",
      tokenStyles,
      existingStyles,
    });

    expect(result.hasConflict).toBe(false);
    expect(result.matchingToken?.id).toBe("existing1");
  });

  test("detects conflict when one style property differs", () => {
    const existingStyles: StyleDecl[] = [
      createStyleDecl("existing1", "base", "color", {
        type: "keyword",
        value: "white",
      }),
      createStyleDecl("existing1", "base", "backgroundColor", {
        type: "keyword",
        value: "blue",
      }),
    ];
    const tokenStyles: StyleDecl[] = [
      createStyleDecl("fragment1", "base", "color", {
        type: "keyword",
        value: "white",
      }),
      createStyleDecl("fragment1", "base", "backgroundColor", {
        type: "keyword",
        value: "red",
      }),
    ];
    const result = findTokenMatch({
      tokenName: "ButtonStyle",
      tokenStyles,
      existingStyles,
    });

    expect(result.hasConflict).toBe(true);
    expect(result.matchingToken).toBeUndefined();
  });

  test("handles empty token styles", () => {
    const result = findTokenMatch({
      tokenName: "EmptyToken",
    });

    expect(result.hasConflict).toBe(false);
    expect(result.matchingToken?.id).toBe("existing1");
  });
});

describe("detectTokenConflicts", () => {
  const breakpoints = new Map<Breakpoint["id"], Breakpoint>([
    ["base", { id: "base", label: "Base" }],
  ]);
  const getConflicts = ({
    fragmentStyleSources,
    fragmentStyles,
    existingStyleSources = [],
    existingStyles = [],
    breakpointsMap = breakpoints,
    mergedBreakpointIds = new Map<string, string>(),
  }: {
    fragmentStyleSources: StyleSource[];
    fragmentStyles: StyleDecl[];
    existingStyleSources?: StyleSource[];
    existingStyles?: StyleDecl[];
    breakpointsMap?: Map<Breakpoint["id"], Breakpoint>;
    mergedBreakpointIds?: Map<string, string>;
  }) =>
    detectTokenConflicts({
      fragmentStyleSources,
      fragmentStyles,
      existingStyleSources: toMap(existingStyleSources),
      existingStyles: createStyleDeclMap(existingStyles),
      breakpoints: breakpointsMap,
      mergedBreakpointIds,
    });

  test("returns empty array when no conflicts exist", () => {
    const conflicts = getConflicts({
      fragmentStyleSources: [{ type: "token", id: "frag1", name: "NewToken" }],
      fragmentStyles: [
        createStyleDecl("frag1", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
      existingStyleSources: [
        { type: "token", id: "exist1", name: "ExistingToken" },
      ],
      existingStyles: [
        createStyleDecl("exist1", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
      ],
    });

    expect(conflicts).toHaveLength(0);
  });

  test("detects conflict when token name exists with different styles", () => {
    const conflicts = getConflicts({
      fragmentStyleSources: [
        { type: "token", id: "frag1", name: "PrimaryColor" },
      ],
      fragmentStyles: [
        createStyleDecl("frag1", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
      existingStyleSources: [
        { type: "token", id: "exist1", name: "PrimaryColor" },
      ],
      existingStyles: [
        createStyleDecl("exist1", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
      ],
    });

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].tokenName).toBe("PrimaryColor");
    expect(conflicts[0].fragmentTokenId).toBe("frag1");
    expect(conflicts[0].existingToken.id).toBe("exist1");
  });

  test("detects multiple conflicts", () => {
    const conflicts = getConflicts({
      fragmentStyleSources: [
        { type: "token", id: "frag1", name: "PrimaryColor" },
        { type: "token", id: "frag2", name: "SecondaryColor" },
      ],
      fragmentStyles: [
        createStyleDecl("frag1", "base", "color", {
          type: "keyword",
          value: "red",
        }),
        createStyleDecl("frag2", "base", "color", {
          type: "keyword",
          value: "green",
        }),
      ],
      existingStyleSources: [
        { type: "token", id: "exist1", name: "PrimaryColor" },
        { type: "token", id: "exist2", name: "SecondaryColor" },
      ],
      existingStyles: [
        createStyleDecl("exist1", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
        createStyleDecl("exist2", "base", "color", {
          type: "keyword",
          value: "yellow",
        }),
      ],
    });

    expect(conflicts).toHaveLength(2);
    expect(conflicts[0].tokenName).toBe("PrimaryColor");
    expect(conflicts[1].tokenName).toBe("SecondaryColor");
  });

  test("ignores local style sources", () => {
    const conflicts = getConflicts({
      fragmentStyleSources: [
        { type: "local", id: "frag1" },
        { type: "token", id: "frag2", name: "SomeToken" },
      ],
      fragmentStyles: [
        createStyleDecl("frag1", "base", "color", {
          type: "keyword",
          value: "red",
        }),
        createStyleDecl("frag2", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
      ],
    });

    expect(conflicts).toHaveLength(0);
  });

  test("no conflict when token name matches and styles match", () => {
    const conflicts = getConflicts({
      fragmentStyleSources: [
        { type: "token", id: "frag1", name: "SharedToken" },
      ],
      fragmentStyles: [
        createStyleDecl("frag1", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
      existingStyleSources: [
        { type: "token", id: "exist1", name: "SharedToken" },
      ],
      existingStyles: [
        createStyleDecl("exist1", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
    });

    expect(conflicts).toHaveLength(0);
  });

  test("handles tokens with no styles", () => {
    const conflicts = getConflicts({
      fragmentStyleSources: [
        { type: "token", id: "frag1", name: "EmptyToken" },
      ],
      fragmentStyles: [],
      existingStyleSources: [
        { type: "token", id: "exist1", name: "EmptyToken" },
      ],
    });

    expect(conflicts).toHaveLength(0);
  });

  test("uses merged breakpoint IDs when comparing", () => {
    const breakpointsMap = new Map<Breakpoint["id"], Breakpoint>([
      ["base", { id: "base", label: "Base" }],
      ["tablet-exist", { id: "tablet-exist", minWidth: 768, label: "Tablet" }],
    ]);
    const mergedBreakpointIds = new Map([["tablet-frag", "tablet-exist"]]);

    const conflicts = getConflicts({
      fragmentStyleSources: [
        { type: "token", id: "frag1", name: "ResponsiveToken" },
      ],
      fragmentStyles: [
        createStyleDecl("frag1", "tablet-frag", "fontSize", {
          type: "unit",
          value: 18,
          unit: "px",
        }),
      ],
      existingStyleSources: [
        { type: "token", id: "exist1", name: "ResponsiveToken" },
      ],
      existingStyles: [
        createStyleDecl("exist1", "tablet-exist", "fontSize", {
          type: "unit",
          value: 18,
          unit: "px",
        }),
      ],
      breakpointsMap,
      mergedBreakpointIds,
    });

    // Should be no conflict since the breakpoints are merged and styles match
    expect(conflicts).toHaveLength(0);
  });
});
