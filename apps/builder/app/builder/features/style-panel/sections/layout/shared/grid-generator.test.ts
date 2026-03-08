import { describe, test, expect } from "vitest";
import type { StyleDecl } from "@webstudio-is/sdk";
import { __testing__ } from "./grid-generator";

const { gridPresets, computeFillGridData, applyFillGridItems } = __testing__;

const makeIdGenerator = () => {
  let counter = 0;
  return () => `id-${++counter}`;
};

const createEmptyData = (parentId: string) => ({
  instances: new Map([
    [
      parentId,
      {
        type: "instance" as const,
        id: parentId,
        component: "Box",
        children: [] as Array<{ type: "id"; value: string }>,
      },
    ],
  ]),
  styleSources: new Map<string, { type: "local"; id: string }>(),
  styleSourceSelections: new Map<
    string,
    { instanceId: string; values: string[] }
  >(),
  styles: new Map<string, StyleDecl>(),
});

describe("gridPresets", () => {
  test("each preset has required fields", () => {
    for (const preset of gridPresets) {
      expect(preset.label).toBeTruthy();
      expect(preset.columns).toBeTruthy();
      expect(preset.rows).toBeTruthy();
      expect(preset.previewColumns).toBeTruthy();
      expect(preset.previewRows).toBeTruthy();
    }
  });

  test("no preset duplicates what the NxM picker does", () => {
    const equalFrPattern = /^(1fr\s*)+$/;
    for (const preset of gridPresets) {
      const trivialCols = equalFrPattern.test(preset.columns);
      const trivialRows = equalFrPattern.test(preset.rows);
      // At least one axis must go beyond equal 1fr tracks
      expect(trivialCols && trivialRows).toBe(false);
    }
  });

  test("fluid sidebar uses fit-content", () => {
    const sidebar = gridPresets.find((p) => p.label === "Fluid sidebar");
    expect(sidebar).toBeDefined();
    expect(sidebar?.columns).toContain("fit-content");
  });

  test("page stack has auto-sized header and footer rows", () => {
    const stack = gridPresets.find((p) => p.label === "Page stack");
    expect(stack).toBeDefined();
    expect(stack?.rows).toBe("auto 1fr auto");
  });

  test("holy grail preset has named areas", () => {
    const holyGrail = gridPresets.find((p) => p.label === "Holy grail");
    expect(holyGrail).toBeDefined();
    expect(holyGrail?.areas).toBeDefined();
    expect(holyGrail?.areas).toContain("header");
    expect(holyGrail?.areas).toContain("sidebar");
    expect(holyGrail?.areas).toContain("main");
    expect(holyGrail?.areas).toContain("footer");
  });

  test("responsive cards uses auto-fit with 250px minimum", () => {
    const cards = gridPresets.find((p) => p.label === "Responsive cards");
    expect(cards).toBeDefined();
    expect(cards?.columns).toContain("auto-fit");
    expect(cards?.columns).toContain("250px");
  });

  test("feature section uses auto-fit with 350px minimum", () => {
    const feature = gridPresets.find((p) => p.label === "Feature section");
    expect(feature).toBeDefined();
    expect(feature?.columns).toContain("auto-fit");
    expect(feature?.columns).toContain("350px");
  });

  test("footer columns uses auto-fit with 150px minimum", () => {
    const footer = gridPresets.find((p) => p.label === "Footer columns");
    expect(footer).toBeDefined();
    expect(footer?.columns).toContain("auto-fit");
    expect(footer?.columns).toContain("150px");
  });

  test("all auto-fit presets have distinct minmax thresholds", () => {
    const autoFitPresets = gridPresets.filter((p) =>
      p.columns.includes("auto-fit")
    );
    const thresholds = autoFitPresets.map((p) => {
      const match = p.columns.match(/minmax\((\d+)px/);
      return match?.[1];
    });
    expect(new Set(thresholds).size).toBe(thresholds.length);
  });

  test("preview thumbnails visually distinguish each preset", () => {
    const previews = gridPresets.map(
      (p) => `${p.previewColumns}|${p.previewRows}`
    );
    expect(new Set(previews).size).toBe(previews.length);
  });
});

describe("computeFillGridData", () => {
  test("returns items for each empty cell", () => {
    const items = computeFillGridData({
      totalCells: 6,
      existingChildCount: 0,
      generateId: makeIdGenerator(),
    });
    expect(items.length).toBe(6);
  });

  test("subtracts existing children", () => {
    const items = computeFillGridData({
      totalCells: 6,
      existingChildCount: 4,
      generateId: makeIdGenerator(),
    });
    expect(items.length).toBe(2);
  });

  test("returns empty array when grid is already full", () => {
    const items = computeFillGridData({
      totalCells: 4,
      existingChildCount: 4,
      generateId: makeIdGenerator(),
    });
    expect(items.length).toBe(0);
  });

  test("returns empty array when grid has more children than cells", () => {
    const items = computeFillGridData({
      totalCells: 4,
      existingChildCount: 7,
      generateId: makeIdGenerator(),
    });
    expect(items.length).toBe(0);
  });

  test("each item has unique instanceId and styleSourceId", () => {
    const items = computeFillGridData({
      totalCells: 9,
      existingChildCount: 0,
      generateId: makeIdGenerator(),
    });
    const instanceIds = items.map((item) => item.instanceId);
    const styleSourceIds = items.map((item) => item.styleSourceId);
    const allIds = [...instanceIds, ...styleSourceIds];
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  test("single cell grid with no children returns one item", () => {
    const items = computeFillGridData({
      totalCells: 1,
      existingChildCount: 0,
      generateId: makeIdGenerator(),
    });
    expect(items.length).toBe(1);
  });
});

describe("applyFillGridItems", () => {
  test("creates Box instances in the data", () => {
    const data = createEmptyData("grid-1");
    const items = computeFillGridData({
      totalCells: 3,
      existingChildCount: 0,
      generateId: makeIdGenerator(),
    });
    applyFillGridItems(data, items, "bp-1", "grid-1");

    expect(data.instances.size).toBe(4); // parent + 3 children
    for (const item of items) {
      const instance = data.instances.get(item.instanceId);
      expect(instance).toBeDefined();
      expect(instance?.component).toBe("Box");
      expect(instance?.children).toEqual([]);
    }
  });

  test("appends children to parent instance", () => {
    const data = createEmptyData("grid-1");
    const items = computeFillGridData({
      totalCells: 2,
      existingChildCount: 0,
      generateId: makeIdGenerator(),
    });
    applyFillGridItems(data, items, "bp-1", "grid-1");

    const parent = data.instances.get("grid-1");
    expect(parent?.children.length).toBe(2);
    expect(parent?.children[0]).toEqual({
      type: "id",
      value: items[0].instanceId,
    });
    expect(parent?.children[1]).toEqual({
      type: "id",
      value: items[1].instanceId,
    });
  });

  test("preserves existing children when appending", () => {
    const data = createEmptyData("grid-1");
    const parent = data.instances.get("grid-1")!;
    parent.children.push({ type: "id", value: "existing-child" });

    const items = computeFillGridData({
      totalCells: 3,
      existingChildCount: 1,
      generateId: makeIdGenerator(),
    });
    applyFillGridItems(data, items, "bp-1", "grid-1");

    expect(parent.children.length).toBe(3);
    expect(parent.children[0]).toEqual({
      type: "id",
      value: "existing-child",
    });
  });

  test("creates local style sources for each item", () => {
    const data = createEmptyData("grid-1");
    const items = computeFillGridData({
      totalCells: 2,
      existingChildCount: 0,
      generateId: makeIdGenerator(),
    });
    applyFillGridItems(data, items, "bp-1", "grid-1");

    expect(data.styleSources.size).toBe(2);
    for (const item of items) {
      const source = data.styleSources.get(item.styleSourceId);
      expect(source).toEqual({ type: "local", id: item.styleSourceId });
    }
  });

  test("links style sources to instances via selections", () => {
    const data = createEmptyData("grid-1");
    const items = computeFillGridData({
      totalCells: 2,
      existingChildCount: 0,
      generateId: makeIdGenerator(),
    });
    applyFillGridItems(data, items, "bp-1", "grid-1");

    expect(data.styleSourceSelections.size).toBe(2);
    for (const item of items) {
      const selection = data.styleSourceSelections.get(item.instanceId);
      expect(selection).toEqual({
        instanceId: item.instanceId,
        values: [item.styleSourceId],
      });
    }
  });

  test("sets display flex and flex-direction column on each item", () => {
    const data = createEmptyData("grid-1");
    const items = computeFillGridData({
      totalCells: 2,
      existingChildCount: 0,
      generateId: makeIdGenerator(),
    });
    applyFillGridItems(data, items, "bp-1", "grid-1");

    expect(data.styles.size).toBe(4);
    const styleValues = Array.from(data.styles.values()) as Array<{
      breakpointId: string;
      property: string;
      value: { type: string; value: string };
    }>;
    for (const style of styleValues) {
      expect(style.breakpointId).toBe("bp-1");
    }
    const displayStyles = styleValues.filter((s) => s.property === "display");
    const directionStyles = styleValues.filter(
      (s) => s.property === "flexDirection"
    );
    expect(displayStyles).toHaveLength(2);
    expect(directionStyles).toHaveLength(2);
    for (const style of displayStyles) {
      expect(style.value).toEqual({ type: "keyword", value: "flex" });
    }
    for (const style of directionStyles) {
      expect(style.value).toEqual({ type: "keyword", value: "column" });
    }
  });

  test("does nothing when parent instance is missing", () => {
    const data = createEmptyData("grid-1");
    const items = computeFillGridData({
      totalCells: 2,
      existingChildCount: 0,
      generateId: makeIdGenerator(),
    });
    applyFillGridItems(data, items, "bp-1", "nonexistent");

    // No new instances or styles should be created
    expect(data.instances.size).toBe(1); // only original parent
    expect(data.styleSources.size).toBe(0);
    expect(data.styles.size).toBe(0);
  });

  test("handles empty items array", () => {
    const data = createEmptyData("grid-1");
    applyFillGridItems(data, [], "bp-1", "grid-1");

    const parent = data.instances.get("grid-1");
    expect(parent?.children.length).toBe(0);
    expect(data.styleSources.size).toBe(0);
  });
});
