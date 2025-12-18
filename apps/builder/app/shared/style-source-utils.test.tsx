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
  insertPortalLocalStyleSources,
  insertLocalStyleSourcesWithNewIds,
  deleteStyleSourceMutable,
  findUnusedTokens,
  deleteStyleSourcesMutable,
  validateAndRenameStyleSource,
  renameStyleSourceMutable,
  deleteLocalStyleSourcesMutable,
  collectStyleSourcesFromInstances,
  findDuplicateTokens,
  findTokenWithMatchingStyles,
  detectTokenConflicts,
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

describe("getStyleSourceStylesSignature", () => {
  test("generates consistent signature for token styles", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
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

    const signature = getStyleSourceStylesSignature(
      "token1",
      styles,
      breakpoints,
      new Map()
    );

    expect(signature).toBeTruthy();
    expect(typeof signature).toBe("string");
  });

  test("generates same signature for same styles in different order", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
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

    const signature1 = getStyleSourceStylesSignature(
      "token1",
      styles1,
      breakpoints,
      new Map()
    );
    const signature2 = getStyleSourceStylesSignature(
      "token1",
      styles2,
      breakpoints,
      new Map()
    );

    expect(signature1).toBe(signature2);
  });

  test("generates different signature for different styles", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
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

    const signature1 = getStyleSourceStylesSignature(
      "token1",
      styles1,
      breakpoints,
      new Map()
    );
    const signature2 = getStyleSourceStylesSignature(
      "token2",
      styles2,
      breakpoints,
      new Map()
    );

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

    const signature1 = getStyleSourceStylesSignature(
      "token1",
      styles1,
      breakpoints,
      new Map()
    );
    const signature2 = getStyleSourceStylesSignature(
      "token2",
      styles2,
      breakpoints,
      new Map()
    );

    expect(signature1).not.toBe(signature2);
  });

  test("handles pseudo states correctly", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
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

    const signature1 = getStyleSourceStylesSignature(
      "token1",
      styles1,
      breakpoints,
      new Map()
    );
    const signature2 = getStyleSourceStylesSignature(
      "token2",
      styles2,
      breakpoints,
      new Map()
    );

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

    const signature1 = getStyleSourceStylesSignature(
      "token1",
      styles1,
      breakpoints,
      new Map()
    );
    const signature2 = getStyleSourceStylesSignature(
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

    const signature1 = getStyleSourceStylesSignature(
      "token1",
      styles1,
      breakpoints,
      new Map()
    );
    const signature2 = getStyleSourceStylesSignature(
      "token2",
      styles2,
      breakpoints,
      new Map()
    );

    expect(signature1).toBe(signature2);
  });
});

describe("insertStyleSources", () => {
  // Case 2: Same styles AND same name -> reuse existing token
  test("token with same styles and same name reuses existing token", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const existingStyleSources = toMap<StyleSource>([
      { id: "existingToken", type: "token", name: "primaryColor" },
    ]);
    const existingStyles = new Map<string, StyleDecl>([
      [
        "existingToken:base:color:",
        createStyleDecl("existingToken", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
      [
        "existingToken:base:fontSize:",
        createStyleDecl("existingToken", "base", "fontSize", {
          type: "unit",
          value: 16,
          unit: "px",
        }),
      ],
    ]);

    const fragmentStyleSources: StyleSource[] = [
      { id: "newToken", type: "token", name: "primaryColor" },
    ];
    const fragmentStyles: StyleDecl[] = [
      createStyleDecl("newToken", "base", "color", {
        type: "keyword",
        value: "red",
      }),
      createStyleDecl("newToken", "base", "fontSize", {
        type: "unit",
        value: 16,
        unit: "px",
      }),
    ];

    const { styleSourceIdMap, updatedStyleSources } = insertStyleSources({
      fragmentStyleSources,
      fragmentStyles,
      existingStyleSources,
      existingStyles,
      breakpoints,
      mergedBreakpointIds: new Map(),
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
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const existingStyleSources = toMap<StyleSource>([
      { id: "token1", type: "token", name: "primaryColor" },
    ]);
    const existingStyles = new Map<string, StyleDecl>([
      [
        "token1:base:color:",
        createStyleDecl("token1", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
    ]);

    const fragmentStyleSources: StyleSource[] = [
      { id: "token2", type: "token", name: "accentColor" },
    ];
    const fragmentStyles: StyleDecl[] = [
      createStyleDecl("token2", "base", "color", {
        type: "keyword",
        value: "red",
      }),
    ];

    const { styleSourceIds, styleSourceIdMap, updatedStyleSources } =
      insertStyleSources({
        fragmentStyleSources,
        fragmentStyles,
        existingStyleSources,
        existingStyles,
        breakpoints,
        mergedBreakpointIds: new Map(),
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
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const existingStyleSources = toMap<StyleSource>([
      { id: "token1", type: "token", name: "myToken" },
    ]);
    const existingStyles = new Map<string, StyleDecl>([
      [
        "token1:base:color:",
        createStyleDecl("token1", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
      ],
    ]);

    const fragmentStyleSources: StyleSource[] = [
      { id: "token2", type: "token", name: "myToken" },
    ];
    const fragmentStyles: StyleDecl[] = [
      createStyleDecl("token2", "base", "color", {
        type: "keyword",
        value: "red",
      }),
    ];

    const { styleSourceIds, styleSourceIdMap, updatedStyleSources } =
      insertStyleSources({
        fragmentStyleSources,
        fragmentStyles,
        existingStyleSources,
        existingStyles,
        breakpoints,
        mergedBreakpointIds: new Map(),
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
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const existingStyleSources = toMap<StyleSource>([
      { id: "token1", type: "token", name: "myToken" },
      { id: "token2", type: "token", name: "myToken-1" },
      { id: "token3", type: "token", name: "myToken-2" },
    ]);
    const existingStyles = new Map<string, StyleDecl>([
      [
        "token1:base:color:",
        createStyleDecl("token1", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
      ],
      [
        "token2:base:color:",
        createStyleDecl("token2", "base", "color", {
          type: "keyword",
          value: "green",
        }),
      ],
      [
        "token3:base:color:",
        createStyleDecl("token3", "base", "color", {
          type: "keyword",
          value: "yellow",
        }),
      ],
    ]);

    const fragmentStyleSources: StyleSource[] = [
      { id: "token4", type: "token", name: "myToken" },
    ];
    const fragmentStyles: StyleDecl[] = [
      createStyleDecl("token4", "base", "color", {
        type: "keyword",
        value: "red",
      }),
    ];

    const { updatedStyleSources } = insertStyleSources({
      fragmentStyleSources,
      fragmentStyles,
      existingStyleSources,
      existingStyles,
      breakpoints,
      mergedBreakpointIds: new Map(),
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
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const existingStyleSources = toMap<StyleSource>([
      { id: "token1", type: "token", name: "primaryColor" },
    ]);
    const existingStyles = new Map<string, StyleDecl>([
      [
        "token1:base:color:",
        createStyleDecl("token1", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
      ],
    ]);

    const fragmentStyleSources: StyleSource[] = [
      { id: "token2", type: "token", name: "secondaryColor" },
    ];
    const fragmentStyles: StyleDecl[] = [
      createStyleDecl("token2", "base", "color", {
        type: "keyword",
        value: "red",
      }),
    ];

    const { styleSourceIds, styleSourceIdMap, updatedStyleSources } =
      insertStyleSources({
        fragmentStyleSources,
        fragmentStyles,
        existingStyleSources,
        existingStyles,
        breakpoints,
        mergedBreakpointIds: new Map(),
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
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const existingStyleSources = toMap<StyleSource>([
      { id: "token1", type: "token", name: "primaryColor" },
      { id: "token2", type: "token", name: "accentColor" }, // This name is taken
    ]);
    const existingStyles = new Map<string, StyleDecl>([
      [
        "token1:base:color:",
        createStyleDecl("token1", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
      [
        "token2:base:fontSize:",
        createStyleDecl("token2", "base", "fontSize", {
          type: "unit",
          value: 16,
          unit: "px",
        }),
      ],
    ]);

    const fragmentStyleSources: StyleSource[] = [
      { id: "token3", type: "token", name: "accentColor" },
    ];
    const fragmentStyles: StyleDecl[] = [
      createStyleDecl("token3", "base", "color", {
        type: "keyword",
        value: "red",
      }),
    ];

    const { updatedStyleSources } = insertStyleSources({
      fragmentStyleSources,
      fragmentStyles,
      existingStyleSources,
      existingStyles,
      breakpoints,
      mergedBreakpointIds: new Map(),
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
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const existingStyleSources = toMap<StyleSource>([
      { id: "token1", type: "token", name: "primaryColor" },
      { id: "token2", type: "token", name: "secondaryColor" }, // This name is taken
    ]);
    const existingStyles = new Map<string, StyleDecl>([
      [
        "token1:base:color:",
        createStyleDecl("token1", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
      ],
      [
        "token2:base:color:",
        createStyleDecl("token2", "base", "color", {
          type: "keyword",
          value: "green",
        }),
      ],
    ]);

    const fragmentStyleSources: StyleSource[] = [
      { id: "token3", type: "token", name: "secondaryColor" },
    ];
    const fragmentStyles: StyleDecl[] = [
      createStyleDecl("token3", "base", "color", {
        type: "keyword",
        value: "red",
      }),
    ];

    const { updatedStyleSources } = insertStyleSources({
      fragmentStyleSources,
      fragmentStyles,
      existingStyleSources,
      existingStyles,
      breakpoints,
      mergedBreakpointIds: new Map(),
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
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const existingStyleSources = toMap<StyleSource>([
      { id: "existingToken", type: "token", name: "primaryColor" },
    ]);
    const existingStyles = new Map<string, StyleDecl>([
      [
        "existingToken:base:color:",
        createStyleDecl("existingToken", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
      [
        "existingToken:base:fontSize:",
        createStyleDecl("existingToken", "base", "fontSize", {
          type: "unit",
          value: 16,
          unit: "px",
        }),
      ],
    ]);

    const fragmentStyleSources: StyleSource[] = [
      { id: "newToken", type: "token", name: "accentColor" },
    ];
    const fragmentStyles: StyleDecl[] = [
      createStyleDecl("newToken", "base", "color", {
        type: "keyword",
        value: "red",
      }),
      createStyleDecl("newToken", "base", "fontSize", {
        type: "unit",
        value: 16,
        unit: "px",
      }),
    ];

    const { updatedStyleSources } = insertStyleSources({
      fragmentStyleSources,
      fragmentStyles,
      existingStyleSources,
      existingStyles,
      breakpoints,
      mergedBreakpointIds: new Map(),
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
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const existingStyleSources = toMap<StyleSource>([
      { id: "existingToken", type: "token", name: "bbb-1" },
    ]);
    const existingStyles = new Map<string, StyleDecl>([
      [
        "existingToken:base:color:",
        createStyleDecl("existingToken", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
      ],
    ]);

    const fragmentStyleSources: StyleSource[] = [
      { id: "newToken", type: "token", name: "bbb" },
    ];
    const fragmentStyles: StyleDecl[] = [
      createStyleDecl("newToken", "base", "color", {
        type: "keyword",
        value: "blue",
      }),
    ];

    const { styleSourceIdMap, updatedStyleSources } = insertStyleSources({
      fragmentStyleSources,
      fragmentStyles,
      existingStyleSources,
      existingStyles,
      breakpoints,
      mergedBreakpointIds: new Map(),
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
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const existingStyleSources = toMap<StyleSource>([
      { id: "existingToken", type: "token", name: "primaryColor" },
    ]);
    const existingStyles = new Map<string, StyleDecl>([
      [
        "existingToken:base:color:",
        createStyleDecl("existingToken", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
      ],
      [
        "existingToken:base:fontSize:",
        createStyleDecl("existingToken", "base", "fontSize", {
          type: "unit",
          value: 16,
          unit: "px",
        }),
      ],
    ]);

    const fragmentStyleSources: StyleSource[] = [
      { id: "newToken", type: "token", name: "primaryColor" },
    ];
    const fragmentStyles: StyleDecl[] = [
      createStyleDecl("newToken", "base", "color", {
        type: "keyword",
        value: "red", // Different color - should override
      }),
      createStyleDecl("newToken", "base", "fontWeight", {
        type: "keyword",
        value: "bold", // Additional property - should be added
      }),
    ];

    const { styleSourceIds, styleSourceIdMap, updatedStyleSources } =
      insertStyleSources({
        fragmentStyleSources,
        fragmentStyles,
        existingStyleSources,
        existingStyles,
        breakpoints,
        mergedBreakpointIds: new Map(),
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

describe("deleteStyleSourceMutable", () => {
  test("deletes style source from styleSources map", () => {
    const styleSources: StyleSources = new Map([
      [
        "token1",
        { type: "token", id: "token1", name: "Primary Color" } as StyleSource,
      ],
      [
        "token2",
        { type: "token", id: "token2", name: "Secondary Color" } as StyleSource,
      ],
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
      [
        "token1",
        { type: "token", id: "token1", name: "Primary Color" } as StyleSource,
      ],
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
      [
        "token1",
        { type: "token", id: "token1", name: "Primary Color" } as StyleSource,
      ],
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
    const styleSources: StyleSources = new Map([
      [
        "token1",
        { type: "token", id: "token1", name: "Used Token" } as StyleSource,
      ],
      [
        "token2",
        { type: "token", id: "token2", name: "Unused Token" } as StyleSource,
      ],
      [
        "token3",
        { type: "token", id: "token3", name: "Another Unused" } as StyleSource,
      ],
      ["local1", { type: "local", id: "local1" } as StyleSource],
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
      [
        "token1",
        { type: "token", id: "token1", name: "Used Token 1" } as StyleSource,
      ],
      [
        "token2",
        { type: "token", id: "token2", name: "Used Token 2" } as StyleSource,
      ],
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
      ["local1", { type: "local", id: "local1" } as StyleSource],
      ["local2", { type: "local", id: "local2" } as StyleSource],
    ]);
    const styleSourceUsages = new Map();

    const unusedTokens = findUnusedTokens({ styleSources, styleSourceUsages });

    expect(unusedTokens).toEqual([]);
  });

  test("treats undefined usages as unused", () => {
    const styleSources: StyleSources = new Map([
      [
        "token1",
        { type: "token", id: "token1", name: "Unused Token" } as StyleSource,
      ],
    ]);
    const styleSourceUsages = new Map();

    const unusedTokens = findUnusedTokens({ styleSources, styleSourceUsages });

    expect(unusedTokens).toEqual(["token1"]);
  });
});

describe("deleteStyleSourcesMutable", () => {
  test("deletes multiple style sources", () => {
    const styleSources: StyleSources = new Map([
      [
        "token1",
        { type: "token", id: "token1", name: "Token 1" } as StyleSource,
      ],
      [
        "token2",
        { type: "token", id: "token2", name: "Token 2" } as StyleSource,
      ],
      [
        "token3",
        { type: "token", id: "token3", name: "Token 3" } as StyleSource,
      ],
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
      [
        "token1",
        { type: "token", id: "token1", name: "Token 1" } as StyleSource,
      ],
      [
        "token2",
        { type: "token", id: "token2", name: "Token 2" } as StyleSource,
      ],
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
      [
        "token1",
        { type: "token", id: "token1", name: "Token 1" } as StyleSource,
      ],
      [
        "token2",
        { type: "token", id: "token2", name: "Token 2" } as StyleSource,
      ],
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
      [
        "token1",
        { type: "token", id: "token1", name: "Token 1" } as StyleSource,
      ],
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
      [
        "token1",
        { type: "token", id: "token1", name: "Old Name" } as StyleSource,
      ],
      [
        "token2",
        { type: "token", id: "token2", name: "Other Token" } as StyleSource,
      ],
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
      [
        "token1",
        { type: "token", id: "token1", name: "Old Name" } as StyleSource,
      ],
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
      [
        "token1",
        { type: "token", id: "token1", name: "Old Name" } as StyleSource,
      ],
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
      [
        "token1",
        { type: "token", id: "token1", name: "Primary Color" } as StyleSource,
      ],
      [
        "token2",
        {
          type: "token",
          id: "token2",
          name: "Secondary Color",
        } as StyleSource,
      ],
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
      [
        "token1",
        { type: "token", id: "token1", name: "Primary Color" } as StyleSource,
      ],
    ]);

    const error = validateAndRenameStyleSource({
      id: "token1",
      name: "Primary Color",
      styleSources,
    });

    expect(error).toBeUndefined();
  });

  test("ignores local style sources when checking duplicates", () => {
    const styleSources: StyleSources = new Map([
      [
        "token1",
        { type: "token", id: "token1", name: "Primary Color" } as StyleSource,
      ],
      ["local1", { type: "local", id: "local1" } as StyleSource],
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
      [
        "token1",
        { type: "token", id: "token1", name: "Old Name" } as StyleSource,
      ],
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
    const styleSources: StyleSources = new Map([
      ["local1", { type: "local", id: "local1" } as StyleSource],
    ]);

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
      [
        "token1",
        { type: "token", id: "token1", name: "Old Name" } as StyleSource,
      ],
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

describe("deleteLocalStyleSourcesMutable", () => {
  test("deletes local style sources from styleSources map", () => {
    const localStyleSourceIds = new Set(["local1", "local2"]);
    const styleSources: StyleSources = new Map([
      ["local1", { type: "local", id: "local1" } as StyleSource],
      ["local2", { type: "local", id: "local2" } as StyleSource],
      ["local3", { type: "local", id: "local3" } as StyleSource],
      ["token1", { type: "token", id: "token1", name: "Token" } as StyleSource],
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
      ["local1", { type: "local", id: "local1" } as StyleSource],
      ["local2", { type: "local", id: "local2" } as StyleSource],
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
    const styleSources: StyleSources = new Map([
      ["local1", { type: "local", id: "local1" } as StyleSource],
    ]);
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
    const styleSources: StyleSources = new Map([
      ["local1", { type: "local", id: "local1" } as StyleSource],
      ["local2", { type: "local", id: "local2" } as StyleSource],
      ["local3", { type: "local", id: "local3" } as StyleSource],
      [
        "token1",
        { type: "token", id: "token1", name: "Token 1" } as StyleSource,
      ],
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
    const styleSources: StyleSources = new Map([
      ["local1", { type: "local", id: "local1" } as StyleSource],
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
      [
        "token1",
        { type: "token", id: "token1", name: "Shared Token" } as StyleSource,
      ],
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
  test("finds tokens with identical styles", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources: StyleSources = new Map([
      [
        "token1",
        { type: "token", id: "token1", name: "Primary Red" } as StyleSource,
      ],
      [
        "token2",
        { type: "token", id: "token2", name: "Accent Red" } as StyleSource,
      ],
      ["token3", { type: "token", id: "token3", name: "Blue" } as StyleSource],
      ["local1", { type: "local", id: "local1" } as StyleSource],
    ]);
    const styles: Styles = new Map([
      [
        "token1:base:color",
        createStyleDecl("token1", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
      [
        "token2:base:color",
        createStyleDecl("token2", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
      [
        "token3:base:color",
        createStyleDecl("token3", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
      ],
    ]);

    const duplicates = findDuplicateTokens({
      styleSources,
      styles,
      breakpoints,
    });

    expect(duplicates.size).toBe(2);
    expect(duplicates.get("token1")).toEqual(["token2"]);
    expect(duplicates.get("token2")).toEqual(["token1"]);
    expect(duplicates.has("token3")).toBe(false);
    expect(duplicates.has("local1")).toBe(false);
  });

  test("finds tokens with same name", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources: StyleSources = new Map([
      [
        "token1",
        { type: "token", id: "token1", name: "Primary" } as StyleSource,
      ],
      [
        "token2",
        { type: "token", id: "token2", name: "Primary" } as StyleSource,
      ],
      [
        "token3",
        { type: "token", id: "token3", name: "Secondary" } as StyleSource,
      ],
    ]);
    const styles: Styles = new Map([
      [
        "token1:base:color",
        createStyleDecl("token1", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
      [
        "token2:base:color",
        createStyleDecl("token2", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
      ],
      [
        "token3:base:color",
        createStyleDecl("token3", "base", "color", {
          type: "keyword",
          value: "green",
        }),
      ],
    ]);

    const duplicates = findDuplicateTokens({
      styleSources,
      styles,
      breakpoints,
    });

    expect(duplicates.size).toBe(2);
    expect(duplicates.get("token1")).toEqual(["token2"]);
    expect(duplicates.get("token2")).toEqual(["token1"]);
    expect(duplicates.has("token3")).toBe(false);
  });

  test("finds tokens with same name AND same styles without duplicating", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources: StyleSources = new Map([
      [
        "token1",
        { type: "token", id: "token1", name: "Primary" } as StyleSource,
      ],
      [
        "token2",
        { type: "token", id: "token2", name: "Primary" } as StyleSource,
      ],
    ]);
    const styles: Styles = new Map([
      [
        "token1:base:color",
        createStyleDecl("token1", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
      [
        "token2:base:color",
        createStyleDecl("token2", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
    ]);

    const duplicates = findDuplicateTokens({
      styleSources,
      styles,
      breakpoints,
    });

    expect(duplicates.size).toBe(2);
    // Should list each token only once, not twice (once for name, once for styles)
    expect(duplicates.get("token1")).toEqual(["token2"]);
    expect(duplicates.get("token2")).toEqual(["token1"]);
  });

  test("finds mixed duplicates: some by style, some by name", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources: StyleSources = new Map([
      ["token1", { type: "token", id: "token1", name: "Red A" } as StyleSource],
      ["token2", { type: "token", id: "token2", name: "Red B" } as StyleSource],
      [
        "token3",
        { type: "token", id: "token3", name: "Duplicate Name" } as StyleSource,
      ],
      [
        "token4",
        { type: "token", id: "token4", name: "Duplicate Name" } as StyleSource,
      ],
    ]);
    const styles: Styles = new Map([
      [
        "token1:base:color",
        createStyleDecl("token1", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
      [
        "token2:base:color",
        createStyleDecl("token2", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
      [
        "token3:base:color",
        createStyleDecl("token3", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
      ],
      [
        "token4:base:color",
        createStyleDecl("token4", "base", "color", {
          type: "keyword",
          value: "green",
        }),
      ],
    ]);

    const duplicates = findDuplicateTokens({
      styleSources,
      styles,
      breakpoints,
    });

    expect(duplicates.size).toBe(4);
    expect(duplicates.get("token1")).toEqual(["token2"]);
    expect(duplicates.get("token2")).toEqual(["token1"]);
    expect(duplicates.get("token3")).toEqual(["token4"]);
    expect(duplicates.get("token4")).toEqual(["token3"]);
  });

  test("finds multiple groups of duplicates", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources: StyleSources = new Map([
      ["token1", { type: "token", id: "token1", name: "Red 1" } as StyleSource],
      ["token2", { type: "token", id: "token2", name: "Red 2" } as StyleSource],
      [
        "token3",
        { type: "token", id: "token3", name: "Blue 1" } as StyleSource,
      ],
      [
        "token4",
        { type: "token", id: "token4", name: "Blue 2" } as StyleSource,
      ],
      [
        "token5",
        { type: "token", id: "token5", name: "Blue 3" } as StyleSource,
      ],
    ]);
    const styles: Styles = new Map([
      [
        "token1:base:color",
        createStyleDecl("token1", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
      [
        "token2:base:color",
        createStyleDecl("token2", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
      [
        "token3:base:color",
        createStyleDecl("token3", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
      ],
      [
        "token4:base:color",
        createStyleDecl("token4", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
      ],
      [
        "token5:base:color",
        createStyleDecl("token5", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
      ],
    ]);

    const duplicates = findDuplicateTokens({
      styleSources,
      styles,
      breakpoints,
    });

    expect(duplicates.size).toBe(5);
    expect(duplicates.get("token1")).toEqual(["token2"]);
    expect(duplicates.get("token2")).toEqual(["token1"]);
    expect(duplicates.get("token3")).toEqual(["token4", "token5"]);
    expect(duplicates.get("token4")).toEqual(["token3", "token5"]);
    expect(duplicates.get("token5")).toEqual(["token3", "token4"]);
  });

  test("returns empty map when no duplicates exist", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources: StyleSources = new Map([
      ["token1", { type: "token", id: "token1", name: "Red" } as StyleSource],
      ["token2", { type: "token", id: "token2", name: "Blue" } as StyleSource],
    ]);
    const styles: Styles = new Map([
      [
        "token1:base:color",
        createStyleDecl("token1", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
      [
        "token2:base:color",
        createStyleDecl("token2", "base", "color", {
          type: "keyword",
          value: "blue",
        }),
      ],
    ]);

    const duplicates = findDuplicateTokens({
      styleSources,
      styles,
      breakpoints,
    });

    expect(duplicates.size).toBe(0);
  });

  test("compares tokens across breakpoints and states", () => {
    const breakpoints = toMap<Breakpoint>([
      { id: "base", label: "base" },
      { id: "tablet", label: "tablet", minWidth: 768 },
    ]);
    const styleSources: StyleSources = new Map([
      [
        "token1",
        { type: "token", id: "token1", name: "Token 1" } as StyleSource,
      ],
      [
        "token2",
        { type: "token", id: "token2", name: "Token 2" } as StyleSource,
      ],
    ]);
    const styles: Styles = new Map([
      [
        "token1:base:color",
        createStyleDecl("token1", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
      [
        "token1:tablet:color",
        {
          ...createStyleDecl("token1", "tablet", "color", {
            type: "keyword",
            value: "blue",
          }),
          state: ":hover",
        },
      ],
      [
        "token2:base:color",
        createStyleDecl("token2", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
      [
        "token2:tablet:color",
        {
          ...createStyleDecl("token2", "tablet", "color", {
            type: "keyword",
            value: "blue",
          }),
          state: ":hover",
        },
      ],
    ]);

    const duplicates = findDuplicateTokens({
      styleSources,
      styles,
      breakpoints,
    });

    expect(duplicates.size).toBe(2);
    expect(duplicates.get("token1")).toEqual(["token2"]);
    expect(duplicates.get("token2")).toEqual(["token1"]);
  });

  test("ignores local style sources", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources: StyleSources = new Map([
      ["local1", { type: "local", id: "local1" } as StyleSource],
      ["local2", { type: "local", id: "local2" } as StyleSource],
    ]);
    const styles: Styles = new Map([
      [
        "local1:base:color",
        createStyleDecl("local1", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
      [
        "local2:base:color",
        createStyleDecl("local2", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
    ]);

    const duplicates = findDuplicateTokens({
      styleSources,
      styles,
      breakpoints,
    });

    expect(duplicates.size).toBe(0);
  });

  test("handles tokens with no styles", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources: StyleSources = new Map([
      [
        "token1",
        { type: "token", id: "token1", name: "Empty 1" } as StyleSource,
      ],
      [
        "token2",
        { type: "token", id: "token2", name: "Empty 2" } as StyleSource,
      ],
      [
        "token3",
        { type: "token", id: "token3", name: "With Styles" } as StyleSource,
      ],
    ]);
    const styles: Styles = new Map([
      [
        "token3:base:color",
        createStyleDecl("token3", "base", "color", {
          type: "keyword",
          value: "red",
        }),
      ],
    ]);

    const duplicates = findDuplicateTokens({
      styleSources,
      styles,
      breakpoints,
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

  test("returns no conflict when token name doesn't exist", () => {
    const existingTokens: StyleSource[] = [
      { type: "token", id: "existing1", name: "PrimaryColor" },
    ];

    const result = findTokenWithMatchingStyles({
      tokenName: "SecondaryColor",
      tokenStyles: [],
      existingTokens,
      existingStyles: [],
      breakpoints,
      mergedBreakpointIds: new Map(),
    });

    expect(result.hasConflict).toBe(false);
    expect(result.matchingToken).toBeUndefined();
  });

  test("returns matching token when name and styles match", () => {
    const existingToken: Extract<StyleSource, { type: "token" }> = {
      type: "token",
      id: "existing1",
      name: "PrimaryColor",
    };

    const existingStyles: StyleDecl[] = [
      {
        breakpointId: "base",
        styleSourceId: "existing1",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
    ];

    const tokenStyles: StyleDecl[] = [
      {
        breakpointId: "base",
        styleSourceId: "fragment1",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
    ];

    const result = findTokenWithMatchingStyles({
      tokenName: "PrimaryColor",
      tokenStyles,
      existingTokens: [existingToken],
      existingStyles,
      breakpoints,
      mergedBreakpointIds: new Map(),
    });

    expect(result.hasConflict).toBe(false);
    expect(result.matchingToken).toBeDefined();
    expect(result.matchingToken?.id).toBe("existing1");
  });

  test("returns conflict when name matches but styles differ", () => {
    const existingToken: Extract<StyleSource, { type: "token" }> = {
      type: "token",
      id: "existing1",
      name: "PrimaryColor",
    };

    const existingStyles: StyleDecl[] = [
      {
        breakpointId: "base",
        styleSourceId: "existing1",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
    ];

    const tokenStyles: StyleDecl[] = [
      {
        breakpointId: "base",
        styleSourceId: "fragment1",
        property: "color",
        value: { type: "keyword", value: "blue" }, // Different color
      },
    ];

    const result = findTokenWithMatchingStyles({
      tokenName: "PrimaryColor",
      tokenStyles,
      existingTokens: [existingToken],
      existingStyles,
      breakpoints,
      mergedBreakpointIds: new Map(),
    });

    expect(result.hasConflict).toBe(true);
    expect(result.matchingToken).toBeUndefined();
  });

  test("matches token with multiple style properties", () => {
    const existingToken: Extract<StyleSource, { type: "token" }> = {
      type: "token",
      id: "existing1",
      name: "ButtonStyle",
    };

    const existingStyles: StyleDecl[] = [
      {
        breakpointId: "base",
        styleSourceId: "existing1",
        property: "color",
        value: { type: "keyword", value: "white" },
      },
      {
        breakpointId: "base",
        styleSourceId: "existing1",
        property: "backgroundColor",
        value: { type: "keyword", value: "blue" },
      },
      {
        breakpointId: "base",
        styleSourceId: "existing1",
        property: "paddingTop",
        value: { type: "unit", value: 10, unit: "px" },
      },
    ];

    const tokenStyles: StyleDecl[] = [
      {
        breakpointId: "base",
        styleSourceId: "fragment1",
        property: "paddingTop",
        value: { type: "unit", value: 10, unit: "px" },
      },
      {
        breakpointId: "base",
        styleSourceId: "fragment1",
        property: "backgroundColor",
        value: { type: "keyword", value: "blue" },
      },
      {
        breakpointId: "base",
        styleSourceId: "fragment1",
        property: "color",
        value: { type: "keyword", value: "white" },
      },
    ];

    const result = findTokenWithMatchingStyles({
      tokenName: "ButtonStyle",
      tokenStyles,
      existingTokens: [existingToken],
      existingStyles,
      breakpoints,
      mergedBreakpointIds: new Map(),
    });

    expect(result.hasConflict).toBe(false);
    expect(result.matchingToken?.id).toBe("existing1");
  });

  test("detects conflict when one style property differs", () => {
    const existingToken: Extract<StyleSource, { type: "token" }> = {
      type: "token",
      id: "existing1",
      name: "ButtonStyle",
    };

    const existingStyles: StyleDecl[] = [
      {
        breakpointId: "base",
        styleSourceId: "existing1",
        property: "color",
        value: { type: "keyword", value: "white" },
      },
      {
        breakpointId: "base",
        styleSourceId: "existing1",
        property: "backgroundColor",
        value: { type: "keyword", value: "blue" },
      },
    ];

    const tokenStyles: StyleDecl[] = [
      {
        breakpointId: "base",
        styleSourceId: "fragment1",
        property: "color",
        value: { type: "keyword", value: "white" },
      },
      {
        breakpointId: "base",
        styleSourceId: "fragment1",
        property: "backgroundColor",
        value: { type: "keyword", value: "red" }, // Different!
      },
    ];

    const result = findTokenWithMatchingStyles({
      tokenName: "ButtonStyle",
      tokenStyles,
      existingTokens: [existingToken],
      existingStyles,
      breakpoints,
      mergedBreakpointIds: new Map(),
    });

    expect(result.hasConflict).toBe(true);
    expect(result.matchingToken).toBeUndefined();
  });

  test("handles empty token styles", () => {
    const existingToken: Extract<StyleSource, { type: "token" }> = {
      type: "token",
      id: "existing1",
      name: "EmptyToken",
    };

    const result = findTokenWithMatchingStyles({
      tokenName: "EmptyToken",
      tokenStyles: [],
      existingTokens: [existingToken],
      existingStyles: [],
      breakpoints,
      mergedBreakpointIds: new Map(),
    });

    expect(result.hasConflict).toBe(false);
    expect(result.matchingToken?.id).toBe("existing1");
  });
});

describe("detectTokenConflicts", () => {
  const breakpoints = new Map<Breakpoint["id"], Breakpoint>([
    ["base", { id: "base", label: "Base" }],
  ]);

  test("returns empty array when no conflicts exist", () => {
    const fragmentStyleSources: StyleSource[] = [
      { type: "token", id: "frag1", name: "NewToken" },
    ];

    const fragmentStyles: StyleDecl[] = [
      {
        breakpointId: "base",
        styleSourceId: "frag1",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
    ];

    const existingStyleSources = new Map<string, StyleSource>([
      ["exist1", { type: "token", id: "exist1", name: "ExistingToken" }],
    ]);

    const existingStyles = new Map<string, StyleDecl>([
      [
        "exist1:base:color",
        {
          breakpointId: "base",
          styleSourceId: "exist1",
          property: "color",
          value: { type: "keyword", value: "blue" },
        },
      ],
    ]);

    const conflicts = detectTokenConflicts({
      fragmentStyleSources,
      fragmentStyles,
      existingStyleSources,
      existingStyles,
      breakpoints,
      mergedBreakpointIds: new Map(),
    });

    expect(conflicts).toHaveLength(0);
  });

  test("detects conflict when token name exists with different styles", () => {
    const fragmentStyleSources: StyleSource[] = [
      { type: "token", id: "frag1", name: "PrimaryColor" },
    ];

    const fragmentStyles: StyleDecl[] = [
      {
        breakpointId: "base",
        styleSourceId: "frag1",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
    ];

    const existingStyleSources = new Map<string, StyleSource>([
      ["exist1", { type: "token", id: "exist1", name: "PrimaryColor" }],
    ]);

    const existingStyles = new Map<string, StyleDecl>([
      [
        "exist1:base:color",
        {
          breakpointId: "base",
          styleSourceId: "exist1",
          property: "color",
          value: { type: "keyword", value: "blue" }, // Different color
        },
      ],
    ]);

    const conflicts = detectTokenConflicts({
      fragmentStyleSources,
      fragmentStyles,
      existingStyleSources,
      existingStyles,
      breakpoints,
      mergedBreakpointIds: new Map(),
    });

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].tokenName).toBe("PrimaryColor");
    expect(conflicts[0].fragmentTokenId).toBe("frag1");
    expect(conflicts[0].existingToken.id).toBe("exist1");
  });

  test("detects multiple conflicts", () => {
    const fragmentStyleSources: StyleSource[] = [
      { type: "token", id: "frag1", name: "PrimaryColor" },
      { type: "token", id: "frag2", name: "SecondaryColor" },
    ];

    const fragmentStyles: StyleDecl[] = [
      {
        breakpointId: "base",
        styleSourceId: "frag1",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
      {
        breakpointId: "base",
        styleSourceId: "frag2",
        property: "color",
        value: { type: "keyword", value: "green" },
      },
    ];

    const existingStyleSources = new Map<string, StyleSource>([
      ["exist1", { type: "token", id: "exist1", name: "PrimaryColor" }],
      ["exist2", { type: "token", id: "exist2", name: "SecondaryColor" }],
    ]);

    const existingStyles = new Map<string, StyleDecl>([
      [
        "exist1:base:color",
        {
          breakpointId: "base",
          styleSourceId: "exist1",
          property: "color",
          value: { type: "keyword", value: "blue" },
        },
      ],
      [
        "exist2:base:color",
        {
          breakpointId: "base",
          styleSourceId: "exist2",
          property: "color",
          value: { type: "keyword", value: "yellow" },
        },
      ],
    ]);

    const conflicts = detectTokenConflicts({
      fragmentStyleSources,
      fragmentStyles,
      existingStyleSources,
      existingStyles,
      breakpoints,
      mergedBreakpointIds: new Map(),
    });

    expect(conflicts).toHaveLength(2);
    expect(conflicts[0].tokenName).toBe("PrimaryColor");
    expect(conflicts[1].tokenName).toBe("SecondaryColor");
  });

  test("ignores local style sources", () => {
    const fragmentStyleSources: StyleSource[] = [
      { type: "local", id: "frag1" },
      { type: "token", id: "frag2", name: "SomeToken" },
    ];

    const fragmentStyles: StyleDecl[] = [
      {
        breakpointId: "base",
        styleSourceId: "frag1",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
      {
        breakpointId: "base",
        styleSourceId: "frag2",
        property: "color",
        value: { type: "keyword", value: "blue" },
      },
    ];

    const existingStyleSources = new Map<string, StyleSource>();
    const existingStyles = new Map<string, StyleDecl>();

    const conflicts = detectTokenConflicts({
      fragmentStyleSources,
      fragmentStyles,
      existingStyleSources,
      existingStyles,
      breakpoints,
      mergedBreakpointIds: new Map(),
    });

    expect(conflicts).toHaveLength(0);
  });

  test("no conflict when token name matches and styles match", () => {
    const fragmentStyleSources: StyleSource[] = [
      { type: "token", id: "frag1", name: "SharedToken" },
    ];

    const fragmentStyles: StyleDecl[] = [
      {
        breakpointId: "base",
        styleSourceId: "frag1",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
    ];

    const existingStyleSources = new Map<string, StyleSource>([
      ["exist1", { type: "token", id: "exist1", name: "SharedToken" }],
    ]);

    const existingStyles = new Map<string, StyleDecl>([
      [
        "exist1:base:color",
        {
          breakpointId: "base",
          styleSourceId: "exist1",
          property: "color",
          value: { type: "keyword", value: "red" }, // Same color
        },
      ],
    ]);

    const conflicts = detectTokenConflicts({
      fragmentStyleSources,
      fragmentStyles,
      existingStyleSources,
      existingStyles,
      breakpoints,
      mergedBreakpointIds: new Map(),
    });

    expect(conflicts).toHaveLength(0);
  });

  test("handles tokens with no styles", () => {
    const fragmentStyleSources: StyleSource[] = [
      { type: "token", id: "frag1", name: "EmptyToken" },
    ];

    const fragmentStyles: StyleDecl[] = [];

    const existingStyleSources = new Map<string, StyleSource>([
      ["exist1", { type: "token", id: "exist1", name: "EmptyToken" }],
    ]);

    const existingStyles = new Map<string, StyleDecl>();

    const conflicts = detectTokenConflicts({
      fragmentStyleSources,
      fragmentStyles,
      existingStyleSources,
      existingStyles,
      breakpoints,
      mergedBreakpointIds: new Map(),
    });

    expect(conflicts).toHaveLength(0);
  });

  test("uses merged breakpoint IDs when comparing", () => {
    const fragmentStyleSources: StyleSource[] = [
      { type: "token", id: "frag1", name: "ResponsiveToken" },
    ];

    const fragmentStyles: StyleDecl[] = [
      {
        breakpointId: "tablet-frag",
        styleSourceId: "frag1",
        property: "fontSize",
        value: { type: "unit", value: 18, unit: "px" },
      },
    ];

    const breakpointsMap = new Map<Breakpoint["id"], Breakpoint>([
      ["base", { id: "base", label: "Base" }],
      ["tablet-exist", { id: "tablet-exist", minWidth: 768, label: "Tablet" }],
    ]);

    const mergedBreakpointIds = new Map([["tablet-frag", "tablet-exist"]]);

    const existingStyleSources = new Map<string, StyleSource>([
      ["exist1", { type: "token", id: "exist1", name: "ResponsiveToken" }],
    ]);

    const existingStyles = new Map<string, StyleDecl>([
      [
        "exist1:tablet-exist:fontSize",
        {
          breakpointId: "tablet-exist",
          styleSourceId: "exist1",
          property: "fontSize",
          value: { type: "unit", value: 18, unit: "px" },
        },
      ],
    ]);

    const conflicts = detectTokenConflicts({
      fragmentStyleSources,
      fragmentStyles,
      existingStyleSources,
      existingStyles,
      breakpoints: breakpointsMap,
      mergedBreakpointIds,
    });

    // Should be no conflict since the breakpoints are merged and styles match
    expect(conflicts).toHaveLength(0);
  });
});
