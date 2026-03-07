import { describe, test, expect } from "vitest";
import type {
  StyleDecl,
  StyleDeclKey,
  StyleSource,
  StyleSourceSelection,
} from "@webstudio-is/sdk";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-engine";
import { isAutoGridPlacement, resetGridChildPlacement } from "./grid-utils";

const createStyleDecl = (
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

const createStyleDeclEntry = (
  styleDecl: StyleDecl
): [StyleDeclKey, StyleDecl] => [
  `${styleDecl.styleSourceId}:${styleDecl.breakpointId}:${styleDecl.property}:`,
  styleDecl,
];

const createData = ({
  styleSourcesList = [],
  selectionsList = [],
  styleDeclsList = [],
}: {
  styleSourcesList?: StyleSource[];
  selectionsList?: StyleSourceSelection[];
  styleDeclsList?: StyleDecl[];
}) => ({
  styleSources: new Map(styleSourcesList.map((s) => [s.id, s])),
  styleSourceSelections: new Map(selectionsList.map((s) => [s.instanceId, s])),
  styles: new Map(styleDeclsList.map((d) => createStyleDeclEntry(d))),
});

const auto: StyleValue = { type: "keyword", value: "auto" };
const numeric = (n: number): StyleValue => ({
  type: "unit",
  value: n,
  unit: "number",
});
const keyword = (v: string): StyleValue => ({ type: "keyword", value: v });

describe("isAutoGridPlacement", () => {
  test("returns true when instance has no style source selection", () => {
    const data = createData({});
    expect(isAutoGridPlacement({ ...data, instanceId: "child" })).toBe(true);
  });

  test("returns true when instance has no local style sources", () => {
    const data = createData({
      styleSourcesList: [{ id: "token1", type: "token", name: "Token" }],
      selectionsList: [{ instanceId: "child", values: ["token1"] }],
    });
    expect(isAutoGridPlacement({ ...data, instanceId: "child" })).toBe(true);
  });

  test("returns true when no grid placement styles exist", () => {
    const data = createData({
      styleSourcesList: [{ id: "local1", type: "local" }],
      selectionsList: [{ instanceId: "child", values: ["local1"] }],
      styleDeclsList: [
        createStyleDecl("local1", "bp1", "alignSelf", keyword("center")),
      ],
    });
    expect(isAutoGridPlacement({ ...data, instanceId: "child" })).toBe(true);
  });

  test("returns true when all grid placement values are auto", () => {
    const data = createData({
      styleSourcesList: [{ id: "local1", type: "local" }],
      selectionsList: [{ instanceId: "child", values: ["local1"] }],
      styleDeclsList: [
        createStyleDecl("local1", "bp1", "gridColumnStart", auto),
        createStyleDecl("local1", "bp1", "gridColumnEnd", auto),
        createStyleDecl("local1", "bp1", "gridRowStart", auto),
        createStyleDecl("local1", "bp1", "gridRowEnd", auto),
      ],
    });
    expect(isAutoGridPlacement({ ...data, instanceId: "child" })).toBe(true);
  });

  test("returns false when grid placement has numeric values", () => {
    const data = createData({
      styleSourcesList: [{ id: "local1", type: "local" }],
      selectionsList: [{ instanceId: "child", values: ["local1"] }],
      styleDeclsList: [
        createStyleDecl("local1", "bp1", "gridColumnStart", numeric(2)),
        createStyleDecl("local1", "bp1", "gridColumnEnd", numeric(3)),
        createStyleDecl("local1", "bp1", "gridRowStart", numeric(1)),
        createStyleDecl("local1", "bp1", "gridRowEnd", numeric(2)),
      ],
    });
    expect(isAutoGridPlacement({ ...data, instanceId: "child" })).toBe(false);
  });

  test("returns false when any single property is numeric", () => {
    const data = createData({
      styleSourcesList: [{ id: "local1", type: "local" }],
      selectionsList: [{ instanceId: "child", values: ["local1"] }],
      styleDeclsList: [
        createStyleDecl("local1", "bp1", "gridColumnStart", numeric(2)),
      ],
    });
    expect(isAutoGridPlacement({ ...data, instanceId: "child" })).toBe(false);
  });

  test("returns false when grid placement uses named areas", () => {
    const data = createData({
      styleSourcesList: [{ id: "local1", type: "local" }],
      selectionsList: [{ instanceId: "child", values: ["local1"] }],
      styleDeclsList: [
        createStyleDecl("local1", "bp1", "gridColumnStart", keyword("main")),
        createStyleDecl("local1", "bp1", "gridColumnEnd", keyword("main")),
        createStyleDecl("local1", "bp1", "gridRowStart", keyword("main")),
        createStyleDecl("local1", "bp1", "gridRowEnd", keyword("main")),
      ],
    });
    expect(isAutoGridPlacement({ ...data, instanceId: "child" })).toBe(false);
  });

  test("ignores grid placement styles from token style sources", () => {
    const data = createData({
      styleSourcesList: [
        { id: "token1", type: "token", name: "Token" },
        { id: "local1", type: "local" },
      ],
      selectionsList: [{ instanceId: "child", values: ["token1", "local1"] }],
      styleDeclsList: [
        // Token has grid placement — should be ignored
        createStyleDecl("token1", "bp1", "gridColumnStart", numeric(2)),
        // Local has no grid placement
        createStyleDecl("local1", "bp1", "alignSelf", keyword("center")),
      ],
    });
    expect(isAutoGridPlacement({ ...data, instanceId: "child" })).toBe(true);
  });
});

describe("resetGridChildPlacement", () => {
  test("removes grid placement styles from local style source", () => {
    const data = createData({
      styleSourcesList: [{ id: "local1", type: "local" }],
      selectionsList: [{ instanceId: "child", values: ["local1"] }],
      styleDeclsList: [
        createStyleDecl("local1", "bp1", "gridColumnStart", numeric(2)),
        createStyleDecl("local1", "bp1", "gridColumnEnd", numeric(3)),
        createStyleDecl("local1", "bp1", "gridRowStart", numeric(1)),
        createStyleDecl("local1", "bp1", "gridRowEnd", numeric(2)),
        createStyleDecl("local1", "bp1", "alignSelf", keyword("center")),
      ],
    });

    resetGridChildPlacement({ ...data, instanceId: "child" });

    // Grid placement styles should be removed
    expect(data.styles.size).toBe(1);
    const remaining = [...data.styles.values()][0];
    expect(remaining.property).toBe("alignSelf");
  });

  test("keeps non-grid styles intact", () => {
    const data = createData({
      styleSourcesList: [{ id: "local1", type: "local" }],
      selectionsList: [{ instanceId: "child", values: ["local1"] }],
      styleDeclsList: [
        createStyleDecl("local1", "bp1", "alignSelf", keyword("center")),
        createStyleDecl("local1", "bp1", "justifySelf", keyword("start")),
        createStyleDecl("local1", "bp1", "order", numeric(1)),
      ],
    });

    resetGridChildPlacement({ ...data, instanceId: "child" });

    expect(data.styles.size).toBe(3);
  });

  test("does nothing when instance has no style source selection", () => {
    const data = createData({});
    resetGridChildPlacement({ ...data, instanceId: "child" });
    expect(data.styles.size).toBe(0);
  });

  test("does nothing when instance has no local style sources", () => {
    const data = createData({
      styleSourcesList: [{ id: "token1", type: "token", name: "Token" }],
      selectionsList: [{ instanceId: "child", values: ["token1"] }],
      styleDeclsList: [
        createStyleDecl("token1", "bp1", "gridColumnStart", numeric(2)),
      ],
    });

    resetGridChildPlacement({ ...data, instanceId: "child" });

    // Token styles should not be touched
    expect(data.styles.size).toBe(1);
  });

  test("removes auto-valued grid placement styles", () => {
    const data = createData({
      styleSourcesList: [{ id: "local1", type: "local" }],
      selectionsList: [{ instanceId: "child", values: ["local1"] }],
      styleDeclsList: [
        createStyleDecl("local1", "bp1", "gridColumnStart", auto),
        createStyleDecl("local1", "bp1", "gridColumnEnd", auto),
      ],
    });

    resetGridChildPlacement({ ...data, instanceId: "child" });

    expect(data.styles.size).toBe(0);
  });

  test("removes grid placement across multiple breakpoints", () => {
    const data = createData({
      styleSourcesList: [{ id: "local1", type: "local" }],
      selectionsList: [{ instanceId: "child", values: ["local1"] }],
      styleDeclsList: [
        createStyleDecl("local1", "bp1", "gridColumnStart", numeric(1)),
        createStyleDecl("local1", "bp2", "gridColumnStart", numeric(3)),
        createStyleDecl("local1", "bp1", "alignSelf", keyword("center")),
      ],
    });

    resetGridChildPlacement({ ...data, instanceId: "child" });

    expect(data.styles.size).toBe(1);
    const remaining = [...data.styles.values()][0];
    expect(remaining.property).toBe("alignSelf");
  });
});
