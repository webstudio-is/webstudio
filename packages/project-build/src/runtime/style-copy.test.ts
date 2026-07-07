import { describe, expect, test } from "vitest";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-engine";
import {
  getStyleDeclKey,
  ROOT_INSTANCE_ID,
  type Breakpoint,
  type StyleDecl,
  type StyleSource,
  type StyleSourceSelection,
  type StyleSourceSelections,
  type StyleSources,
  type Styles,
} from "@webstudio-is/sdk";
import {
  collectStyleSourcesFromInstances,
  detectTokenConflicts,
  findTokenWithMatchingStyles,
  getStyleSourceStylesSignature,
  insertLocalStyleSourcesWithNewIds,
  insertPortalLocalStyleSources,
  insertStyleSources,
  insertTokenStyleSources,
} from "./style-copy";

const toMap = <T extends { id: string }>(items: T[]) =>
  new Map(items.map((item) => [item.id, item] as const));

const style = (
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

const styleMap = (styles: StyleDecl[]) =>
  new Map(styles.map((item) => [getStyleDeclKey(item), item]));

const token = (id: string, name: string): StyleSource => ({
  type: "token",
  id,
  name,
});

const local = (id: string): StyleSource => ({ type: "local", id });

const baseBreakpoints = toMap<Breakpoint>([{ id: "base", label: "Base" }]);
const red = { type: "keyword", value: "red" } satisfies StyleValue;
const blue = { type: "keyword", value: "blue" } satisfies StyleValue;

describe("token conflict helpers", () => {
  test("creates stable style signatures independent of declaration order", () => {
    const first = [
      style("token", "base", "color", red),
      style("token", "base", "backgroundColor", blue),
    ];
    const second = [...first].reverse();

    expect(
      getStyleSourceStylesSignature("token", first, baseBreakpoints, new Map())
    ).toBe(
      getStyleSourceStylesSignature("token", second, baseBreakpoints, new Map())
    );
  });

  test("finds matching tokens and detects conflicting tokens", () => {
    const existingStyles = [style("existing", "base", "color", red)];

    expect(
      findTokenWithMatchingStyles({
        tokenName: "Primary",
        tokenStyles: [style("incoming", "base", "color", red)],
        existingTokens: [token("existing", "Primary")],
        existingStyles,
        breakpoints: baseBreakpoints,
        mergedBreakpointIds: new Map(),
      })
    ).toMatchObject({
      hasConflict: false,
      matchingToken: token("existing", "Primary"),
    });

    expect(
      findTokenWithMatchingStyles({
        tokenName: "Primary",
        tokenStyles: [style("incoming", "base", "color", blue)],
        existingTokens: [token("existing", "Primary")],
        existingStyles,
        breakpoints: baseBreakpoints,
        mergedBreakpointIds: new Map(),
      }).hasConflict
    ).toBe(true);
  });

  test("detects token conflicts by name and different styles", () => {
    expect(
      detectTokenConflicts({
        fragmentStyleSources: [token("incoming", "Primary")],
        fragmentStyles: [style("incoming", "base", "color", blue)],
        existingStyleSources: toMap([token("existing", "Primary")]),
        existingStyles: styleMap([style("existing", "base", "color", red)]),
        breakpoints: baseBreakpoints,
        mergedBreakpointIds: new Map(),
      })
    ).toEqual([
      {
        tokenName: "Primary",
        fragmentTokenId: "incoming",
        fragmentToken: token("incoming", "Primary"),
        existingToken: token("existing", "Primary"),
      },
    ]);
  });
});

describe("style source insertion", () => {
  test("reuses matching tokens and suffixes conflicting incoming tokens", () => {
    const reused = insertStyleSources({
      fragmentStyleSources: [token("incoming", "Primary")],
      fragmentStyles: [style("incoming", "base", "color", red)],
      existingStyleSources: toMap([token("existing", "Primary")]),
      existingStyles: styleMap([style("existing", "base", "color", red)]),
      breakpoints: baseBreakpoints,
      mergedBreakpointIds: new Map(),
    });

    expect(reused.styleSourceIdMap.get("incoming")).toBe("existing");
    expect(reused.styleSourceIds.size).toBe(0);

    const conflicting = insertStyleSources({
      fragmentStyleSources: [token("incoming", "Primary")],
      fragmentStyles: [style("incoming", "base", "color", blue)],
      existingStyleSources: toMap([token("existing", "Primary")]),
      existingStyles: styleMap([style("existing", "base", "color", red)]),
      breakpoints: baseBreakpoints,
      mergedBreakpointIds: new Map(),
    });
    const insertedId = conflicting.styleSourceIdMap.get("incoming");

    expect(insertedId).toBeDefined();
    expect(conflicting.updatedStyleSources.get(insertedId ?? "")).toMatchObject(
      {
        type: "token",
        name: "Primary-1",
      }
    );
  });

  test("inserts token style sources and remaps declarations", () => {
    const styleSources: StyleSources = new Map();
    const styles: Styles = new Map();
    const styleSourceIdMap = insertTokenStyleSources({
      fragmentStyleSources: [token("incoming", "Primary")],
      fragmentStyles: [style("incoming", "old-base", "color", red)],
      styleSources,
      styles,
      breakpoints: baseBreakpoints,
      mergedBreakpointIds: new Map([["old-base", "base"]]),
    });
    const insertedId = styleSourceIdMap.get("incoming");

    expect(styleSources.get(insertedId ?? "")).toMatchObject({
      type: "token",
      name: "Primary",
    });
    expect(Array.from(styles.values())).toEqual([
      {
        ...style("incoming", "old-base", "color", red),
        breakpointId: "base",
        styleSourceId: insertedId,
      },
    ]);
  });

  test("inserts portal local style sources preserving ids", () => {
    const styleSources: StyleSources = new Map();
    const styleSourceSelections: StyleSourceSelections = new Map();
    const styles: Styles = new Map();

    insertPortalLocalStyleSources({
      fragmentStyleSources: [local("local"), token("token", "Primary")],
      fragmentStyleSourceSelections: [
        { instanceId: "portal", values: ["local", "token"] },
      ],
      fragmentStyles: [style("local", "old-base", "color", red)],
      instanceIds: new Set(["portal"]),
      styleSources,
      styleSourceSelections,
      styles,
      mergedBreakpointIds: new Map([["old-base", "base"]]),
    });

    expect(styleSources.get("local")).toEqual(local("local"));
    expect(styleSourceSelections.get("portal")).toEqual({
      instanceId: "portal",
      values: ["local", "token"],
    });
    expect(Array.from(styles.values())).toEqual([
      style("local", "base", "color", red),
    ]);
  });

  test("copies local style sources with new ids and maps selections", () => {
    const styleSources: StyleSources = new Map([
      ["existing-token", token("existing-token", "Primary")],
    ]);
    const styleSourceSelections: StyleSourceSelections = new Map([
      [
        ROOT_INSTANCE_ID,
        { instanceId: ROOT_INSTANCE_ID, values: ["existing-local"] },
      ],
    ]);
    const styles: Styles = new Map();

    insertLocalStyleSourcesWithNewIds({
      fragmentStyleSources: [local("local"), token("old-token", "Primary")],
      fragmentStyleSourceSelections: [
        { instanceId: "old-instance", values: ["local", "old-token"] },
        { instanceId: ROOT_INSTANCE_ID, values: ["local"] },
      ],
      fragmentStyles: [style("local", "old-base", "color", red)],
      fragmentInstanceIds: new Set(["old-instance", ROOT_INSTANCE_ID]),
      newInstanceIds: new Map([["old-instance", "new-instance"]]),
      styleSources,
      styleSourceSelections,
      styles,
      styleSourceIdMap: new Map([["old-token", "existing-token"]]),
      mergedBreakpointIds: new Map([["old-base", "base"]]),
    });

    const newSelection = styleSourceSelections.get("new-instance");
    expect(newSelection?.instanceId).toBe("new-instance");
    expect(newSelection?.values).toContain("existing-token");
    expect(newSelection?.values[0]).not.toBe("local");
    expect(Array.from(styles.values())[0]).toMatchObject({
      breakpointId: "base",
      property: "color",
    });
  });
});

test("collects selected style sources and styles from instances", () => {
  const styleSourceSelections: StyleSourceSelections = new Map([
    ["box", { instanceId: "box", values: ["local", "token"] }],
    ["other", { instanceId: "other", values: ["other-local"] }],
  ]);
  const styleSources: StyleSources = toMap([
    local("local"),
    token("token", "Primary"),
    local("other-local"),
  ]);
  const styles = styleMap([
    style("local", "base", "color", red),
    style("token", "base", "backgroundColor", blue),
    style("other-local", "base", "color", blue),
  ]);

  expect(
    collectStyleSourcesFromInstances({
      instanceIds: new Set(["box"]),
      styleSourceSelections,
      styleSources,
      styles,
    })
  ).toEqual({
    styleSourceSelectionsArray: [
      { instanceId: "box", values: ["local", "token"] },
    ] satisfies StyleSourceSelection[],
    styleSourcesMap: toMap([local("local"), token("token", "Primary")]),
    stylesArray: [
      style("local", "base", "color", red),
      style("token", "base", "backgroundColor", blue),
    ],
  });
});
