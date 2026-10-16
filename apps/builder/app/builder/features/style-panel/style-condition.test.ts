import { describe, expect, test } from "vitest";
import {
  filterStyleConditions,
  getApplicableStyleConditions,
  getDefaultStyleConditions,
  getStyleCondition,
  getStyledSelectors,
} from "./style-condition";

const accordionStates = [
  { label: "Open", selector: '[data-state="open"]' },
  { label: "Closed", selector: '[data-state="closed"]' },
];

describe("getStyleCondition", () => {
  test("tells condition types apart", () => {
    expect(getStyleCondition(":hover", [])).toEqual({
      type: "state",
      selector: ":hover",
    });
    expect(getStyleCondition("::before", [])).toEqual({
      type: "pseudoElement",
      selector: "::before",
    });
    expect(getStyleCondition('[data-state="open"]', accordionStates)).toEqual({
      type: "componentState",
      selector: '[data-state="open"]',
      description: "Open",
    });
    expect(getStyleCondition(":nth-child(2)", [])).toEqual({
      type: "custom",
      selector: ":nth-child(2)",
    });
  });
});

describe("getStyledSelectors", () => {
  test("includes conditions styled on applied sources only", () => {
    const selectors = getStyledSelectors({
      instanceStyleSourceIds: new Set(["local", "applied-token"]),
      styles: [
        { styleSourceId: "local", state: ":hover" },
        { styleSourceId: "applied-token", state: "::before" },
        { styleSourceId: "local", state: undefined },
        { styleSourceId: "local", state: "  " },
        // a token the element does not use
        { styleSourceId: "other-token", state: ":focus-visible" },
      ],
    });
    expect(Array.from(selectors)).toEqual([":hover", "::before"]);
  });
});

describe("getDefaultStyleConditions", () => {
  test("lists styled conditions and the selected one", () => {
    expect(
      getDefaultStyleConditions({
        styledSelectors: [":hover", '[data-state="open"]'],
        selectedState: ":active",
        componentStates: accordionStates,
      })
    ).toEqual([
      { type: "state", selector: ":hover" },
      {
        type: "componentState",
        selector: '[data-state="open"]',
        description: "Open",
      },
      { type: "state", selector: ":active" },
    ]);
  });

  test("is empty for an element without conditions", () => {
    expect(
      getDefaultStyleConditions({
        styledSelectors: [],
        selectedState: undefined,
        componentStates: accordionStates,
      })
    ).toEqual([]);
  });

  test("does not repeat the selected condition", () => {
    expect(
      getDefaultStyleConditions({
        styledSelectors: [":hover"],
        selectedState: ":hover",
        componentStates: [],
      })
    ).toEqual([{ type: "state", selector: ":hover" }]);
  });
});

describe("getApplicableStyleConditions", () => {
  test("offers component states and the element's own states first", () => {
    const conditions = getApplicableStyleConditions({
      tag: "a",
      componentStates: accordionStates,
    });
    const selectors = conditions.map((condition) => condition.selector);
    expect(selectors.slice(0, 2)).toEqual([
      '[data-state="open"]',
      '[data-state="closed"]',
    ]);
    expect(selectors).toContain(":visited");
    expect(selectors).toContain("::before");
    expect(new Set(selectors).size).toEqual(selectors.length);
  });
});

describe("filterStyleConditions", () => {
  const conditions = getApplicableStyleConditions({
    tag: undefined,
    componentStates: accordionStates,
  });

  test("matches selectors and component state labels", () => {
    expect(
      filterStyleConditions(conditions, "hov").map(({ selector }) => selector)
    ).toEqual([":hover"]);
    expect(
      filterStyleConditions(conditions, "closed").map(
        ({ selector }) => selector
      )
    ).toEqual(['[data-state="closed"]']);
  });

  test("returns everything for an empty search", () => {
    expect(filterStyleConditions(conditions, " ")).toHaveLength(
      conditions.length
    );
  });
});
