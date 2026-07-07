import { expect, test } from "vitest";
import {
  getStyleDeclKey,
  type StyleDecl,
  type Styles,
  type StyleSource,
  type StyleSourceSelection,
} from "@webstudio-is/sdk";
import {
  cloneStyles,
  createStyleClonePayload,
  serializeStyleDeclarations,
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
