import type { StyleDecl, StyleSource } from "@webstudio-is/sdk";
import { pseudoClassesByTag } from "@webstudio-is/html-data";
import {
  isPseudoElement,
  pseudoClassDescriptions,
  pseudoElementDescriptions,
} from "@webstudio-is/css-data";

/**
 * A style condition decides when declarations apply. Local or a token still
 * decides where they are saved, so conditions are found per element, not per
 * style source.
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
  if (selector in pseudoClassDescriptions) {
    return { type: "state", selector };
  }
  return { type: "custom", selector };
};

/** Conditions styled on any style source applied to the element. */
export const getStyledSelectors = ({
  instanceStyleSourceIds,
  styles,
}: {
  instanceStyleSourceIds: ReadonlySet<StyleSource["id"]>;
  styles: Iterable<Pick<StyleDecl, "state" | "styleSourceId">>;
}) => {
  const selectors = new Set<string>();
  for (const styleDecl of styles) {
    if (
      isEmptyState(styleDecl.state) === false &&
      instanceStyleSourceIds.has(styleDecl.styleSourceId)
    ) {
      selectors.add(styleDecl.state);
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

/** Every condition offered for the element, for search. */
export const getApplicableStyleConditions = ({
  tag,
  componentStates,
}: {
  tag: undefined | string;
  componentStates: readonly ComponentState[];
}) => {
  const selectors = new Set([
    ...componentStates.map((state) => state.selector),
    // states that apply to this element first
    ...pseudoClassesByTag["*"],
    ...(pseudoClassesByTag[tag ?? ""] ?? []),
    ...Object.keys(pseudoClassDescriptions),
    ...Object.keys(pseudoElementDescriptions),
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
