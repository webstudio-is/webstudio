import { expect, test } from "vitest";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-engine";
import {
  getStyleDeclKey,
  type StyleDecl,
  type Styles,
  type StyleSource,
  type StyleSourceSelection,
} from "@webstudio-is/sdk";
import {
  collectFontFamiliesFromStyleDecls,
  collectFontFamiliesFromStyleValue,
  cloneStyles,
  createStyleClonePayload,
  isAutoGridPlacement,
  resetGridChildPlacement,
  serializeStyleDeclarations,
  traverseStyleValue,
} from "./style-utils";

const createStyleDecl = (
  styleSourceId: string,
  breakpointId: string,
  value?: string
): StyleDecl => {
  return {
    styleSourceId,
    breakpointId,
    property: "width",
    value: {
      type: "keyword",
      value: value ?? "value",
    },
  };
};

const createStyleDeclPair = (
  styleSourceId: string,
  breakpointId: string,
  state?: string,
  value?: string
) => {
  return [
    getStyleDeclKey({
      styleSourceId,
      breakpointId,
      state,
      property: "width",
    }),
    createStyleDecl(styleSourceId, breakpointId, value),
  ] as const;
};

test("clone styles with applied new style source ids", () => {
  const styles: Styles = new Map([
    createStyleDeclPair("styleSource1", "bp1"),
    createStyleDeclPair("styleSource2", "bp2"),
    createStyleDeclPair("styleSource1", "bp3"),
    createStyleDeclPair("styleSource3", "bp4"),
    createStyleDeclPair("styleSource1", "bp5"),
    createStyleDeclPair("styleSource3", "bp6"),
  ]);
  const clonedStyleSourceIds = new Map<StyleSource["id"], StyleSource["id"]>();
  clonedStyleSourceIds.set("styleSource2", "newStyleSource2");
  clonedStyleSourceIds.set("styleSource3", "newStyleSource3");
  expect(cloneStyles(styles, clonedStyleSourceIds)).toEqual([
    createStyleDecl("newStyleSource2", "bp2"),
    createStyleDecl("newStyleSource3", "bp4"),
    createStyleDecl("newStyleSource3", "bp6"),
  ]);
});

test("clones local styles while keeping design tokens shared", () => {
  const styleDecl: StyleDecl = {
    styleSourceId: "local-1",
    breakpointId: "base",
    property: "color",
    value: { type: "keyword", value: "red" },
  };
  const payload = createStyleClonePayload({
    styleSourceSelections: [
      { instanceId: "source-1", values: ["token-1", "local-1"] },
    ],
    styleSources: [
      { type: "local", id: "local-1" },
      { type: "token", id: "token-1", name: "Token" },
    ],
    styles: new Map([[getStyleDeclKey(styleDecl), styleDecl]]),
    nextIdById: new Map([["source-1", "clone-1"]]),
    createId: () => "local-copy",
  });

  expect(payload).toEqual([
    {
      namespace: "styleSources",
      patches: [
        {
          op: "add",
          path: ["local-copy"],
          value: { type: "local", id: "local-copy" },
        },
      ],
    },
    {
      namespace: "styleSourceSelections",
      patches: [
        {
          op: "add",
          path: ["clone-1"],
          value: {
            instanceId: "clone-1",
            values: ["token-1", "local-copy"],
          },
        },
      ],
    },
    {
      namespace: "styles",
      patches: [
        {
          op: "add",
          path: ["local-copy:base:color:"],
          value: { ...styleDecl, styleSourceId: "local-copy" },
        },
      ],
    },
  ]);
});

test("serializes direct and token style declarations for selected instances", () => {
  const styles: StyleDecl[] = [
    {
      styleSourceId: "local-1",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
    {
      styleSourceId: "token-1",
      breakpointId: "base",
      property: "backgroundColor",
      value: { type: "keyword", value: "blue" },
    },
  ];
  const styleSources: StyleSource[] = [
    { type: "local", id: "local-1" },
    { type: "token", id: "token-1", name: "Primary" },
  ];
  const styleSourceSelections: StyleSourceSelection[] = [
    { instanceId: "root-1", values: ["token-1", "local-1"] },
  ];

  expect(
    serializeStyleDeclarations({
      styles,
      styleSources,
      styleSourceSelections,
      instanceIds: new Set(["root-1"]),
      property: "color",
    })
  ).toEqual([
    {
      instanceId: "root-1",
      styleSourceId: "local-1",
      property: "color",
      value: { type: "keyword", value: "red" },
      breakpoint: "base",
      state: undefined,
      source: "local",
    },
  ]);
  expect(
    serializeStyleDeclarations({
      styles,
      styleSources,
      styleSourceSelections,
      instanceIds: new Set(["root-1"]),
    })
  ).toEqual([
    expect.objectContaining({
      styleSourceId: "local-1",
      source: "local",
    }),
  ]);
  expect(
    serializeStyleDeclarations({
      styles,
      styleSources,
      styleSourceSelections,
      instanceIds: new Set(["root-1"]),
      includeTokens: true,
    })
  ).toEqual([
    expect.objectContaining({
      styleSourceId: "local-1",
      source: "local",
    }),
    expect.objectContaining({
      styleSourceId: "token-1",
      source: "token",
    }),
  ]);
});

const getVisitedStyleValueTypes = (value: StyleValue) => {
  const visited: StyleValue["type"][] = [];
  traverseStyleValue(value, (item) => {
    visited.push(item.type);
  });
  return visited;
};

const recursiveStyleValueCases: {
  name: string;
  value: StyleValue;
  expected: StyleValue["type"][];
}[] = [
  {
    name: "var without fallback",
    value: { type: "var", value: "--size" },
    expected: ["var"],
  },
  {
    name: "var fallback",
    value: {
      type: "var",
      value: "--size",
      fallback: { type: "keyword", value: "auto" },
    },
    expected: ["var", "keyword"],
  },
  {
    name: "function args",
    value: {
      type: "function",
      name: "image-set",
      args: {
        type: "image",
        value: { type: "asset", value: "asset-id" },
      },
    },
    expected: ["function", "image"],
  },
  {
    name: "tuple items",
    value: {
      type: "tuple",
      value: [
        { type: "unit", unit: "px", value: 12 },
        {
          type: "var",
          value: "--gap",
          fallback: { type: "rgb", r: 0, g: 0, b: 0, alpha: 1 },
        },
      ],
    },
    expected: ["tuple", "unit", "var", "rgb"],
  },
  {
    name: "layers items",
    value: {
      type: "layers",
      value: [
        { type: "keyword", value: "center" },
        {
          type: "tuple",
          value: [
            {
              type: "color",
              colorSpace: "srgb",
              components: [0, 0, 0],
              alpha: 1,
            },
          ],
        },
      ],
    },
    expected: ["layers", "keyword", "tuple", "color"],
  },
  {
    name: "shadow required fields",
    value: {
      type: "shadow",
      position: "outset",
      offsetX: { type: "unit", unit: "px", value: 1 },
      offsetY: { type: "var", value: "--shadow-y" },
    },
    expected: ["shadow", "unit", "var"],
  },
  {
    name: "shadow optional fields",
    value: {
      type: "shadow",
      position: "inset",
      offsetX: { type: "unit", unit: "px", value: 1 },
      offsetY: { type: "unit", unit: "px", value: 2 },
      blur: {
        type: "var",
        value: "--shadow-blur",
        fallback: { type: "unit", unit: "px", value: 4 },
      },
      spread: { type: "unit", unit: "px", value: 8 },
      color: {
        type: "color",
        colorSpace: "srgb",
        components: [0, 0, 0],
        alpha: {
          type: "var",
          value: "--shadow-opacity",
          fallback: { type: "rgb", r: 0, g: 0, b: 0, alpha: 1 },
        },
      },
    },
    expected: [
      "shadow",
      "unit",
      "unit",
      "var",
      "unit",
      "unit",
      "color",
      "var",
      "rgb",
    ],
  },
  {
    name: "color alpha number",
    value: {
      type: "color",
      colorSpace: "srgb",
      components: [0, 0, 0],
      alpha: 0.5,
    },
    expected: ["color"],
  },
  {
    name: "color alpha var",
    value: {
      type: "color",
      colorSpace: "srgb",
      components: [0, 0, 0],
      alpha: {
        type: "var",
        value: "--opacity",
        fallback: { type: "unit", unit: "number", value: 1 },
      },
    },
    expected: ["color", "var", "unit"],
  },
];

test.each(recursiveStyleValueCases)(
  "traverses recursive style value branch: $name",
  ({ value, expected }) => {
    expect(getVisitedStyleValueTypes(value)).toEqual(expected);
  }
);

const terminalStyleValues = [
  { type: "fontFamily", value: ["Inter", "sans-serif"] },
  { type: "image", value: { type: "asset", value: "asset-id" } },
  { type: "unit", unit: "px", value: 12 },
  { type: "keyword", value: "auto" },
  { type: "unparsed", value: "1fr auto" },
  { type: "invalid", value: "calc(" },
  { type: "unset", value: "" },
  { type: "rgb", r: 0, g: 0, b: 0, alpha: 1 },
  { type: "guaranteedInvalid" },
] satisfies StyleValue[];

test("visits terminal style values once", () => {
  expect(terminalStyleValues.map(getVisitedStyleValueTypes)).toEqual(
    terminalStyleValues.map((value) => [value.type])
  );
});

test("collects font families from direct and nested style values", () => {
  expect(
    collectFontFamiliesFromStyleValue({
      type: "layers",
      value: [
        { type: "fontFamily", value: ["Inter", "sans-serif"] },
        {
          type: "var",
          value: "--font",
          fallback: { type: "fontFamily", value: ["Fallback"] },
        },
      ],
    } as unknown as StyleValue)
  ).toEqual(new Set(["Inter", "sans-serif", "Fallback"]));
});

test("collects font families from style declarations", () => {
  expect(
    collectFontFamiliesFromStyleDecls([
      {
        value: { type: "fontFamily", value: ["Inter"] } as StyleValue,
      },
      {
        value: { type: "keyword", value: "red" },
      },
    ])
  ).toEqual(new Set(["Inter"]));
});

const createGridStyleDecl = (
  styleSourceId: string,
  breakpointId: string,
  property: StyleProperty,
  value: StyleValue
): StyleDecl => ({
  styleSourceId,
  breakpointId,
  property,
  value,
});

const createGridStyleDeclEntry = (styleDecl: StyleDecl) =>
  [getStyleDeclKey(styleDecl), styleDecl] satisfies [
    ReturnType<typeof getStyleDeclKey>,
    StyleDecl,
  ];

const createGridData = ({
  styleSourcesList = [],
  selectionsList = [],
  styleDeclsList = [],
}: {
  styleSourcesList?: StyleSource[];
  selectionsList?: StyleSourceSelection[];
  styleDeclsList?: StyleDecl[];
}) => ({
  styleSources: new Map(
    styleSourcesList.map((styleSource) => [styleSource.id, styleSource])
  ),
  styleSourceSelections: new Map(
    selectionsList.map((selection) => [selection.instanceId, selection])
  ),
  styles: new Map(
    styleDeclsList.map((styleDecl) => createGridStyleDeclEntry(styleDecl))
  ),
});

const auto: StyleValue = { type: "keyword", value: "auto" };
const numeric = (value: number): StyleValue => ({
  type: "unit",
  value,
  unit: "number",
});
const keyword = (value: string): StyleValue => ({ type: "keyword", value });

test("detects auto grid placement from local styles only", () => {
  expect(
    isAutoGridPlacement({ ...createGridData({}), instanceId: "child" })
  ).toBe(true);
  expect(
    isAutoGridPlacement({
      ...createGridData({
        styleSourcesList: [{ id: "token", type: "token", name: "Token" }],
        selectionsList: [{ instanceId: "child", values: ["token"] }],
        styleDeclsList: [
          createGridStyleDecl("token", "base", "gridColumnStart", numeric(2)),
        ],
      }),
      instanceId: "child",
    })
  ).toBe(true);
  expect(
    isAutoGridPlacement({
      ...createGridData({
        styleSourcesList: [{ id: "local", type: "local" }],
        selectionsList: [{ instanceId: "child", values: ["local"] }],
        styleDeclsList: [
          createGridStyleDecl("local", "base", "alignSelf", keyword("center")),
          createGridStyleDecl("local", "base", "gridColumnStart", auto),
        ],
      }),
      instanceId: "child",
    })
  ).toBe(true);
  expect(
    isAutoGridPlacement({
      ...createGridData({
        styleSourcesList: [{ id: "local", type: "local" }],
        selectionsList: [{ instanceId: "child", values: ["local"] }],
        styleDeclsList: [
          createGridStyleDecl("local", "base", "gridColumnStart", numeric(2)),
        ],
      }),
      instanceId: "child",
    })
  ).toBe(false);
  expect(
    isAutoGridPlacement({
      ...createGridData({
        styleSourcesList: [{ id: "local", type: "local" }],
        selectionsList: [{ instanceId: "child", values: ["local"] }],
        styleDeclsList: [
          createGridStyleDecl(
            "local",
            "base",
            "gridColumnStart",
            keyword("main")
          ),
        ],
      }),
      instanceId: "child",
    })
  ).toBe(false);
});

test("resets grid child placement across local styles only", () => {
  const data = createGridData({
    styleSourcesList: [
      { id: "token", type: "token", name: "Token" },
      { id: "local", type: "local" },
    ],
    selectionsList: [{ instanceId: "child", values: ["token", "local"] }],
    styleDeclsList: [
      createGridStyleDecl("token", "base", "gridColumnStart", numeric(2)),
      createGridStyleDecl("local", "base", "gridColumnStart", numeric(2)),
      createGridStyleDecl("local", "tablet", "gridColumnEnd", auto),
      createGridStyleDecl("local", "base", "alignSelf", keyword("center")),
    ],
  });

  resetGridChildPlacement({ ...data, instanceId: "child" });

  expect(
    [...data.styles.values()].map((styleDecl) => styleDecl.property)
  ).toEqual(["gridColumnStart", "alignSelf"]);
  expect([...data.styles.values()][0]?.styleSourceId).toBe("token");
});
