import type { KeyboardEvent } from "react";

const focusableSelector = (extra: string) =>
  [
    "input:not([type=hidden])",
    "select",
    "textarea",
    "button",
    "a[href]",
    "area[href]",
    "summary",
    "iframe",
    "object",
    "embed",
    "audio[controls]",
    "video[controls]",
    "[contenteditable]",
    "[tabindex]",
  ]
    .map((selector) => `${selector}:not([disabled]):not([hidden])${extra}`)
    .join(",");

const keyToDirection: Record<
  string,
  ["vertical" | "horizontal", "+" | "-"] | undefined
> = {
  ArrowUp: ["vertical", "-"],
  ArrowDown: ["vertical", "+"],
  ArrowLeft: ["horizontal", "-"],
  ArrowRight: ["horizontal", "+"],
};

const ROW_ATTRIBUTE = "data-focus-row";
const COLUMN_ATTRIBUTE = "data-focus-column";

type FocusableElements = { elements: Element[]; currentIndex: number };

type Filter =
  | "all"
  | "within-row"
  | "within-column"
  | "first-per-row"
  | "first-per-column";

const getFocusable = (
  filter: Filter,
  root: Element,
  current: Element
): FocusableElements => {
  if (
    filter === "all" ||
    filter === "within-row" ||
    filter === "within-column"
  ) {
    let extraSelector = "";
    if (filter !== "all") {
      const attribute =
        filter === "within-row" ? ROW_ATTRIBUTE : COLUMN_ATTRIBUTE;
      extraSelector = `[${attribute}="${current.getAttribute(attribute)}"]`;
    }

    const elements = Array.from(
      root.querySelectorAll(focusableSelector(extraSelector))
    );

    return { elements, currentIndex: elements.indexOf(current) };
  }

  const attribute =
    filter === "first-per-row" ? ROW_ATTRIBUTE : COLUMN_ATTRIBUTE;
  const map = new Map<string, Element>();

  for (const element of root.querySelectorAll(
    focusableSelector(`[${attribute}]`)
  )) {
    map.set(element.getAttribute(attribute) as string, element);
  }

  return {
    elements: Array.from(map.values()),
    currentIndex: Array.from(map.keys()).indexOf(
      current.getAttribute(attribute) as string
    ),
  };
};

const next = ({ elements, currentIndex }: FocusableElements) =>
  currentIndex === -1
    ? elements[0]
    : elements[(currentIndex + 1) % elements.length];

const previous = ({ elements, currentIndex }: FocusableElements) =>
  currentIndex === -1
    ? elements[elements.length - 1]
    : elements[(currentIndex - 1 + elements.length) % elements.length];

/**
 * Example:
 * ```
 * <div onKeyDown={handleArrowFocus}>
 *   <button />
 *   <button tabIndex={-1} />
 * </div>
 * ```
 */
export const handleArrowFocus = (event: KeyboardEvent) => {
  const direction = keyToDirection[event.key];

  if (direction === undefined) {
    return;
  }

  const [axis, sign] = direction;
  const target = event.target as Element;

  const hasRow = target.getAttribute(ROW_ATTRIBUTE) !== null;
  const hasColumn = target.getAttribute(COLUMN_ATTRIBUTE) !== null;

  let filter: Filter = "all";
  if (axis === "horizontal") {
    if (hasRow) {
      filter = "within-row";
    } else if (hasColumn) {
      filter = "first-per-column";
    }
  } else {
    if (hasColumn) {
      filter = "within-column";
    } else if (hasRow) {
      filter = "first-per-row";
    }
  }

  const focusable = getFocusable(filter, event.currentTarget, target);

  if (focusable.elements.length === 0) {
    return;
  }

  const toFocus = sign === "+" ? next(focusable) : previous(focusable);

  (toFocus as HTMLElement).focus();
};
