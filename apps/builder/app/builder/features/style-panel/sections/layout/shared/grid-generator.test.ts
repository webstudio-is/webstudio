import { describe, test, expect } from "vitest";
import { __testing__ } from "./grid-generator";

const { gridPresets } = __testing__;

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
