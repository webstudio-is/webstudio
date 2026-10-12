import { describe, expect, test } from "vitest";
import {
  filterStyleConditions,
  getDefaultStyleConditions,
  getSearchableStyleConditions,
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
  test("collects non-empty states of the element's applied sources", () => {
    const selectors = getStyledSelectors(
      new Map([
        ["local", [":hover", "  "]],
        ["applied-token", ["::before", ":hover"]],
      ])
    );
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

describe("getSearchableStyleConditions", () => {
  test("offers component states first, then states for the tag", () => {
    const selectors = getSearchableStyleConditions({
      tag: "a",
      componentStates: accordionStates,
      defaultConditions: [],
    }).map((condition) => condition.selector);
    expect(selectors.slice(0, 2)).toEqual([
      '[data-state="open"]',
      '[data-state="closed"]',
    ]);
    expect(selectors).toContain(":hover");
    expect(selectors).toContain(":visited");
    expect(new Set(selectors).size).toEqual(selectors.length);
  });

  test("does not offer states of other tags", () => {
    const selectors = getSearchableStyleConditions({
      tag: "div",
      componentStates: [],
      defaultConditions: [],
    }).map((condition) => condition.selector);
    expect(selectors).not.toContain(":visited");
    expect(selectors).not.toContain(":checked");
  });

  test("never offers functional selectors without arguments", () => {
    const selectors = getSearchableStyleConditions({
      tag: "input",
      componentStates: [],
      defaultConditions: [],
    }).map((condition) => condition.selector);
    expect(selectors.filter((selector) => selector.endsWith("()"))).toEqual([]);
  });

  test("includes custom selectors already styled on the element", () => {
    const conditions = getSearchableStyleConditions({
      tag: "div",
      componentStates: [],
      defaultConditions: getDefaultStyleConditions({
        styledSelectors: ['[data-label="Summer sale"]'],
        selectedState: undefined,
        componentStates: [],
      }),
    });
    expect(
      filterStyleConditions(conditions, "summer").map(
        ({ selector }) => selector
      )
    ).toEqual(['[data-label="Summer sale"]']);
  });
});

describe("filterStyleConditions", () => {
  const conditions = getSearchableStyleConditions({
    tag: undefined,
    componentStates: accordionStates,
    defaultConditions: [],
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
