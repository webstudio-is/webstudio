import { describe, test, expect } from "vitest";
import {
  parseGridTemplateTrackList,
  serializeGridTemplateTrackList,
  parseMinmax,
  serializeMinmax,
  checkGridTemplateSupport,
  getGridAxisMode,
  isImplicitGridMode,
  isEditableGridMode,
  getGridAxisLabel,
} from "./grid-template-tracks";

describe("parseGridTemplateTrackList", () => {
  test("returns empty array for 'none'", () => {
    expect(parseGridTemplateTrackList("none")).toEqual([]);
  });

  test("returns empty array for empty string", () => {
    expect(parseGridTemplateTrackList("")).toEqual([]);
  });

  test("parses simple fr units", () => {
    expect(parseGridTemplateTrackList("1fr")).toEqual([{ value: "1fr" }]);
    expect(parseGridTemplateTrackList("1fr 2fr")).toEqual([
      { value: "1fr" },
      { value: "2fr" },
    ]);
    expect(parseGridTemplateTrackList("1fr 2fr 3fr")).toEqual([
      { value: "1fr" },
      { value: "2fr" },
      { value: "3fr" },
    ]);
  });

  test("parses pixel values", () => {
    expect(parseGridTemplateTrackList("100px")).toEqual([{ value: "100px" }]);
    expect(parseGridTemplateTrackList("100px 200px")).toEqual([
      { value: "100px" },
      { value: "200px" },
    ]);
  });

  test("parses percentage values", () => {
    expect(parseGridTemplateTrackList("50%")).toEqual([{ value: "50%" }]);
    expect(parseGridTemplateTrackList("25% 75%")).toEqual([
      { value: "25%" },
      { value: "75%" },
    ]);
  });

  test("parses mixed units", () => {
    expect(parseGridTemplateTrackList("100px 1fr 50%")).toEqual([
      { value: "100px" },
      { value: "1fr" },
      { value: "50%" },
    ]);
  });

  test("parses auto keyword", () => {
    expect(parseGridTemplateTrackList("auto")).toEqual([{ value: "auto" }]);
    expect(parseGridTemplateTrackList("auto 1fr auto")).toEqual([
      { value: "auto" },
      { value: "1fr" },
      { value: "auto" },
    ]);
  });

  test("parses min-content and max-content", () => {
    expect(parseGridTemplateTrackList("min-content")).toEqual([
      { value: "min-content" },
    ]);
    expect(parseGridTemplateTrackList("max-content")).toEqual([
      { value: "max-content" },
    ]);
    expect(parseGridTemplateTrackList("min-content 1fr max-content")).toEqual([
      { value: "min-content" },
      { value: "1fr" },
      { value: "max-content" },
    ]);
  });

  test("parses minmax() function", () => {
    expect(parseGridTemplateTrackList("minmax(100px, 1fr)")).toEqual([
      { value: "minmax(100px,1fr)" },
    ]);
    expect(
      parseGridTemplateTrackList("minmax(100px, 1fr) minmax(200px, 2fr)")
    ).toEqual([{ value: "minmax(100px,1fr)" }, { value: "minmax(200px,2fr)" }]);
  });

  test("parses fit-content() function", () => {
    expect(parseGridTemplateTrackList("fit-content(200px)")).toEqual([
      { value: "fit-content(200px)" },
    ]);
  });

  test("expands repeat() with number", () => {
    expect(parseGridTemplateTrackList("repeat(3, 1fr)")).toEqual([
      { value: "1fr" },
      { value: "1fr" },
      { value: "1fr" },
    ]);
  });

  test("expands repeat() with multiple tracks", () => {
    expect(parseGridTemplateTrackList("repeat(2, 100px 1fr)")).toEqual([
      { value: "100px" },
      { value: "1fr" },
      { value: "100px" },
      { value: "1fr" },
    ]);
  });

  test("keeps repeat(auto-fill) as single track", () => {
    const result = parseGridTemplateTrackList("repeat(auto-fill, 100px)");
    expect(result).toEqual([{ value: "repeat(auto-fill,100px)" }]);
  });

  test("keeps repeat(auto-fit) as single track", () => {
    const result = parseGridTemplateTrackList(
      "repeat(auto-fit, minmax(100px, 1fr))"
    );
    expect(result).toEqual([{ value: "repeat(auto-fit,minmax(100px,1fr))" }]);
  });

  test("handles complex mixed values", () => {
    expect(
      parseGridTemplateTrackList(
        "100px repeat(2, 1fr) minmax(100px, auto) 50px"
      )
    ).toEqual([
      { value: "100px" },
      { value: "1fr" },
      { value: "1fr" },
      { value: "minmax(100px,auto)" },
      { value: "50px" },
    ]);
  });

  test("ignores line names", () => {
    expect(
      parseGridTemplateTrackList("[header] 1fr [content] 2fr [footer]")
    ).toEqual([{ value: "1fr" }, { value: "2fr" }]);
  });

  test("ignores line names with repeat", () => {
    expect(parseGridTemplateTrackList("repeat(2, [col] 1fr)")).toEqual([
      { value: "1fr" },
      { value: "1fr" },
    ]);
  });
});

describe("serializeGridTemplateTrackList", () => {
  test("returns 'none' for empty array", () => {
    expect(serializeGridTemplateTrackList([])).toBe("none");
  });

  test("joins tracks with spaces", () => {
    expect(
      serializeGridTemplateTrackList([{ value: "1fr" }, { value: "2fr" }])
    ).toBe("1fr 2fr");
  });

  test("handles single track", () => {
    expect(serializeGridTemplateTrackList([{ value: "100px" }])).toBe("100px");
  });

  test("preserves complex values", () => {
    expect(
      serializeGridTemplateTrackList([
        { value: "100px" },
        { value: "minmax(100px,1fr)" },
        { value: "auto" },
      ])
    ).toBe("100px minmax(100px,1fr) auto");
  });
});

describe("round-trip parsing and serialization", () => {
  test("simple values round-trip correctly", () => {
    const original = "1fr 2fr 3fr";
    const parsed = parseGridTemplateTrackList(original);
    const serialized = serializeGridTemplateTrackList(parsed);
    expect(serialized).toBe(original);
  });

  test("mixed values round-trip correctly", () => {
    const original = "100px 1fr auto";
    const parsed = parseGridTemplateTrackList(original);
    const serialized = serializeGridTemplateTrackList(parsed);
    expect(serialized).toBe(original);
  });
});

describe("parseMinmax", () => {
  test("parses simple minmax", () => {
    expect(parseMinmax("minmax(100px, 1fr)")).toEqual({
      min: "100px",
      max: "1fr",
    });
  });

  test("parses minmax with auto", () => {
    expect(parseMinmax("minmax(auto, 1fr)")).toEqual({
      min: "auto",
      max: "1fr",
    });
  });

  test("parses minmax with min-content/max-content", () => {
    expect(parseMinmax("minmax(min-content, max-content)")).toEqual({
      min: "min-content",
      max: "max-content",
    });
  });

  test("parses minmax with percentage", () => {
    expect(parseMinmax("minmax(10%, 50%)")).toEqual({
      min: "10%",
      max: "50%",
    });
  });

  test("returns undefined for non-minmax values", () => {
    expect(parseMinmax("1fr")).toBeUndefined();
    expect(parseMinmax("100px")).toBeUndefined();
    expect(parseMinmax("auto")).toBeUndefined();
  });

  test("returns undefined for other functions", () => {
    expect(parseMinmax("fit-content(200px)")).toBeUndefined();
    expect(parseMinmax("repeat(3, 1fr)")).toBeUndefined();
  });

  test("returns undefined for invalid values", () => {
    expect(parseMinmax("")).toBeUndefined();
    expect(parseMinmax("minmax()")).toBeUndefined();
    expect(parseMinmax("minmax(100px)")).toBeUndefined();
  });
});

describe("serializeMinmax", () => {
  test("creates minmax string", () => {
    expect(serializeMinmax({ min: "100px", max: "1fr" })).toBe(
      "minmax(100px,1fr)"
    );
  });

  test("handles auto values", () => {
    expect(serializeMinmax({ min: "auto", max: "1fr" })).toBe(
      "minmax(auto,1fr)"
    );
  });

  test("handles content values", () => {
    expect(serializeMinmax({ min: "min-content", max: "max-content" })).toBe(
      "minmax(min-content,max-content)"
    );
  });
});

describe("parseMinmax and serializeMinmax round-trip", () => {
  test("minmax round-trips correctly", () => {
    const original = "minmax(100px,1fr)";
    const parsed = parseMinmax(original);
    expect(parsed).not.toBeUndefined();
    const serialized = serializeMinmax(parsed!);
    expect(serialized).toBe(original);
  });
});

describe("checkGridTemplateSupport", () => {
  test("supports empty and none values", () => {
    expect(checkGridTemplateSupport("")).toEqual({ supported: true });
    expect(checkGridTemplateSupport("none")).toEqual({ supported: true });
  });

  test("supports simple track values", () => {
    expect(checkGridTemplateSupport("1fr")).toEqual({ supported: true });
    expect(checkGridTemplateSupport("100px 1fr auto")).toEqual({
      supported: true,
    });
  });

  test("supports minmax()", () => {
    expect(checkGridTemplateSupport("minmax(100px, 1fr)")).toEqual({
      supported: true,
    });
  });

  test("supports repeat() with number", () => {
    expect(checkGridTemplateSupport("repeat(3, 1fr)")).toEqual({
      supported: true,
    });
  });

  test("rejects subgrid", () => {
    const result = checkGridTemplateSupport("subgrid");
    expect(result.supported).toBe(false);
    expect(result).toHaveProperty("reason");
    expect(result).toHaveProperty("type", "subgrid");
  });

  test("rejects masonry", () => {
    const result = checkGridTemplateSupport("masonry");
    expect(result.supported).toBe(false);
    expect(result).toHaveProperty("reason");
    expect(result).toHaveProperty("type", "masonry");
  });

  test("supports CSS variables (should be resolved via computedValue)", () => {
    // CSS variables are supported when using computedValue which resolves them
    const result = checkGridTemplateSupport("var(--grid-cols)");
    expect(result.supported).toBe(true);
  });

  test("rejects repeat(auto-fill)", () => {
    const result = checkGridTemplateSupport("repeat(auto-fill, 100px)");
    expect(result.supported).toBe(false);
    expect(result).toHaveProperty("reason");
    expect(result).toHaveProperty("type", "auto-fill");
  });

  test("rejects repeat(auto-fit)", () => {
    const result = checkGridTemplateSupport(
      "repeat(auto-fit, minmax(100px, 1fr))"
    );
    expect(result.supported).toBe(false);
    expect(result).toHaveProperty("reason");
    expect(result).toHaveProperty("type", "auto-fit");
  });

  test("rejects line names", () => {
    const result = checkGridTemplateSupport("[header] 1fr [content] 2fr");
    expect(result.supported).toBe(false);
    expect(result).toHaveProperty("reason");
    expect(result).toHaveProperty("type", "line-names");
  });

  test("rejects mixed auto-fill with other tracks", () => {
    const result = checkGridTemplateSupport(
      "100px repeat(auto-fill, 1fr) 100px"
    );
    expect(result.supported).toBe(false);
    expect(result).toHaveProperty("reason");
    expect(result).toHaveProperty("type", "auto-fill");
  });
});

describe("getGridAxisMode", () => {
  test("returns 'none' for empty or none values", () => {
    expect(getGridAxisMode("")).toBe("none");
    expect(getGridAxisMode("none")).toBe("none");
  });

  test("returns 'auto' for single auto keyword", () => {
    expect(getGridAxisMode("auto")).toBe("auto");
  });

  test("returns 'explicit' for regular track values", () => {
    expect(getGridAxisMode("1fr 2fr")).toBe("explicit");
    expect(getGridAxisMode("100px 200px")).toBe("explicit");
    expect(getGridAxisMode("repeat(3, 1fr)")).toBe("explicit");
    expect(getGridAxisMode("minmax(100px, 1fr)")).toBe("explicit");
  });

  test("returns 'auto-fill' for repeat(auto-fill, ...)", () => {
    expect(getGridAxisMode("repeat(auto-fill, 100px)")).toBe("auto-fill");
    expect(getGridAxisMode("repeat(auto-fill, minmax(100px, 1fr))")).toBe(
      "auto-fill"
    );
  });

  test("returns 'auto-fit' for repeat(auto-fit, ...)", () => {
    expect(getGridAxisMode("repeat(auto-fit, 100px)")).toBe("auto-fit");
    expect(getGridAxisMode("repeat(auto-fit, minmax(100px, 1fr))")).toBe(
      "auto-fit"
    );
  });

  test("returns 'subgrid' for subgrid", () => {
    expect(getGridAxisMode("subgrid")).toBe("subgrid");
    expect(getGridAxisMode("subgrid [header] [content]")).toBe("subgrid");
  });

  test("returns 'masonry' for masonry", () => {
    expect(getGridAxisMode("masonry")).toBe("masonry");
  });

  test("returns 'line-names' for values with line names", () => {
    expect(getGridAxisMode("[header] 1fr [content]")).toBe("line-names");
  });
});

describe("isImplicitGridMode", () => {
  test("returns true for implicit modes", () => {
    expect(isImplicitGridMode("auto-fill")).toBe(true);
    expect(isImplicitGridMode("auto-fit")).toBe(true);
    expect(isImplicitGridMode("auto")).toBe(true);
    expect(isImplicitGridMode("none")).toBe(true);
  });

  test("returns false for explicit modes", () => {
    expect(isImplicitGridMode("explicit")).toBe(false);
    expect(isImplicitGridMode("subgrid")).toBe(false);
    expect(isImplicitGridMode("masonry")).toBe(false);
    expect(isImplicitGridMode("line-names")).toBe(false);
  });
});

describe("isEditableGridMode", () => {
  test("returns true for editable modes", () => {
    expect(isEditableGridMode("explicit")).toBe(true);
    expect(isEditableGridMode("none")).toBe(true);
    expect(isEditableGridMode("auto")).toBe(true);
  });

  test("returns false for non-editable modes", () => {
    expect(isEditableGridMode("auto-fill")).toBe(false);
    expect(isEditableGridMode("auto-fit")).toBe(false);
    expect(isEditableGridMode("subgrid")).toBe(false);
    expect(isEditableGridMode("masonry")).toBe(false);
    expect(isEditableGridMode("line-names")).toBe(false);
  });
});

describe("getGridAxisLabel", () => {
  test("returns mode name for implicit modes", () => {
    expect(getGridAxisLabel("auto-fill", 5)).toBe("auto-fill");
    expect(getGridAxisLabel("auto-fit", 3)).toBe("auto-fit");
    expect(getGridAxisLabel("auto", 2)).toBe("auto");
    expect(getGridAxisLabel("none", 2)).toBe("none");
  });

  test("returns track count for explicit mode", () => {
    expect(getGridAxisLabel("explicit", 3)).toBe("3");
    expect(getGridAxisLabel("explicit", 5)).toBe("5");
  });

  test("returns mode name for advanced modes", () => {
    expect(getGridAxisLabel("subgrid", 4)).toBe("subgrid");
    expect(getGridAxisLabel("masonry", 3)).toBe("masonry");
    expect(getGridAxisLabel("line-names", 2)).toBe("[…]");
  });
});
