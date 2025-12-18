import { describe, test, expect } from "vitest";
import type { Breakpoint, StyleDecl, StyleSource } from "@webstudio-is/sdk";
import {
  findTokenWithMatchingStyles,
  detectTokenConflicts,
  getStyleSourceStylesSignature,
} from "./style-source-utils";

describe("getStyleSourceStylesSignature", () => {
  test("generates consistent signature for token styles", () => {
    const breakpoints = new Map<Breakpoint["id"], Breakpoint>([
      ["base", { id: "base", label: "Base" }],
      ["tablet", { id: "tablet", minWidth: 768, label: "Tablet" }],
    ]);

    const styles: StyleDecl[] = [
      {
        breakpointId: "base",
        styleSourceId: "token1",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
      {
        breakpointId: "tablet",
        styleSourceId: "token1",
        property: "fontSize",
        value: { type: "unit", value: 16, unit: "px" },
      },
    ];

    const signature = getStyleSourceStylesSignature(
      "token1",
      styles,
      breakpoints,
      new Map()
    );

    expect(signature).toContain("color:red");
    expect(signature).toContain("fontSize:16px");
  });

  test("generates same signature regardless of style order", () => {
    const breakpoints = new Map<Breakpoint["id"], Breakpoint>([
      ["base", { id: "base", label: "Base" }],
    ]);

    const styles1: StyleDecl[] = [
      {
        breakpointId: "base",
        styleSourceId: "token1",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
      {
        breakpointId: "base",
        styleSourceId: "token1",
        property: "fontSize",
        value: { type: "unit", value: 16, unit: "px" },
      },
    ];

    const styles2: StyleDecl[] = [
      {
        breakpointId: "base",
        styleSourceId: "token1",
        property: "fontSize",
        value: { type: "unit", value: 16, unit: "px" },
      },
      {
        breakpointId: "base",
        styleSourceId: "token1",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
    ];

    const sig1 = getStyleSourceStylesSignature(
      "token1",
      styles1,
      breakpoints,
      new Map()
    );
    const sig2 = getStyleSourceStylesSignature(
      "token1",
      styles2,
      breakpoints,
      new Map()
    );

    expect(sig1).toBe(sig2);
  });

  test("uses merged breakpoint IDs when provided", () => {
    const breakpoints = new Map<Breakpoint["id"], Breakpoint>([
      ["base", { id: "base", label: "Base" }],
      [
        "tablet-existing",
        { id: "tablet-existing", minWidth: 768, label: "Tablet" },
      ],
    ]);

    const mergedBreakpointIds = new Map([
      ["tablet-fragment", "tablet-existing"],
    ]);

    const styles: StyleDecl[] = [
      {
        breakpointId: "tablet-fragment",
        styleSourceId: "token1",
        property: "color",
        value: { type: "keyword", value: "blue" },
      },
    ];

    const signature = getStyleSourceStylesSignature(
      "token1",
      styles,
      breakpoints,
      mergedBreakpointIds
    );

    // Should use the merged breakpoint ID
    expect(signature).toBeTruthy();
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
