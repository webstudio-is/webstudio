import type { StyleSource } from "@webstudio-is/sdk";
import { pseudoClassesByTag } from "@webstudio-is/html-data";
import {
  isPseudoElement,
  pseudoClassDescriptions,
} from "@webstudio-is/css-data";

/**
 * A style condition decides when declarations apply. Local or a token still
 * decides where they are saved, so conditions are found per element, not per
 * style source.
 *
 * This is a display classification of the selector stored in
 * `StyleDecl.state`. Property-value conditions are modelled separately.
 */
export type StyleConditionType =
  | "state"
  | "pseudoElement"
  | "componentState"
  | "custom";

export type StyleCondition = {
  type: StyleConditionType;
  /** the selector is always shown as is, e.g. `:hover` or `[data-state="open"]` */
  selector: string;
  /** supporting text, e.g. a component state label like "Open" */
  description?: string;
};

type ComponentState = { label: string; selector: string };

export const styleConditionGroups: Array<{
  type: StyleConditionType;
  label: string;
}> = [
  { type: "componentState", label: "Component states" },
  { type: "state", label: "States" },
  { type: "pseudoElement", label: "Pseudo elements" },
  { type: "custom", label: "Custom selectors" },
];

const nativeStates = new Set([
  ...Object.values(pseudoClassesByTag).flat(),
  ...Object.keys(pseudoClassDescriptions),
]);

const isEmptyState = (state: undefined | string): state is undefined =>
  state === undefined || state.trim() === "";

export const getStyleCondition = (
  selector: string,
  componentStates: readonly ComponentState[]
): StyleCondition => {
  const componentState = componentStates.find(
    (state) => state.selector === selector
  );
  if (componentState !== undefined) {
    return {
      type: "componentState",
      selector,
      description: componentState.label,
    };
  }
  if (isPseudoElement(selector)) {
    return { type: "pseudoElement", selector };
  }
  if (nativeStates.has(selector)) {
    return { type: "state", selector };
  }
  return { type: "custom", selector };
};

/**
 * Conditions styled on any style source applied to the element, from the
 * selected element's existing states-by-source index.
 */
export const getStyledSelectors = (
  statesByStyleSourceId: ReadonlyMap<StyleSource["id"], readonly string[]>
) => {
  const selectors = new Set<string>();
  for (const states of statesByStyleSourceId.values()) {
    for (const state of states) {
      if (isEmptyState(state) === false) {
        selectors.add(state);
      }
    }
  }
  return selectors;
};

/**
 * The short list: conditions already styled on the element plus the active
 * one. Everything else is found through search.
 */
export const getDefaultStyleConditions = ({
  styledSelectors,
  selectedState,
  componentStates,
}: {
  styledSelectors: Iterable<string>;
  selectedState: undefined | string;
  componentStates: readonly ComponentState[];
}) => {
  const selectors = new Set(styledSelectors);
  if (isEmptyState(selectedState) === false) {
    selectors.add(selectedState);
  }
  return Array.from(selectors, (selector) =>
    getStyleCondition(selector, componentStates)
  );
};

/**
 * Everything search offers for the element: its component states, the
 * native states that apply to its tag and every condition from the short
 * list, including custom selectors authored on applied sources.
 *
 * The full CSS catalog, including functional selectors which need arguments,
 * is authored in the style source menu instead.
 */
export const getSearchableStyleConditions = ({
  tag,
  componentStates,
  defaultConditions,
}: {
  tag: undefined | string;
  componentStates: readonly ComponentState[];
  defaultConditions: readonly StyleCondition[];
}) => {
  const selectors = new Set([
    ...componentStates.map((state) => state.selector),
    ...pseudoClassesByTag["*"],
    ...(pseudoClassesByTag[tag ?? ""] ?? []),
    ...defaultConditions.map((condition) => condition.selector),
  ]);
  return Array.from(selectors, (selector) =>
    getStyleCondition(selector, componentStates)
  );
};

/** Matches the selector and the supporting text, ignoring case. */
export const filterStyleConditions = (
  conditions: readonly StyleCondition[],
  query: string
) => {
  const search = query.trim().toLowerCase();
  if (search === "") {
    return [...conditions];
  }
  return conditions.filter(
    (condition) =>
      condition.selector.toLowerCase().includes(search) ||
      condition.description?.toLowerCase().includes(search)
  );
};
