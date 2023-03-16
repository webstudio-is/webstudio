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

const getFocusable = {
  all(root, current) {
    const elements = Array.from(root.querySelectorAll(focusableSelector("")));
    return { elements, currentIndex: elements.indexOf(current) };
  },

  withinRow(root, current) {
    const elements = Array.from(
      root.querySelectorAll(
        focusableSelector(
          `[${ROW_ATTRIBUTE}="${current.getAttribute(ROW_ATTRIBUTE)}"]`
        )
      )
    );
    return { elements, currentIndex: elements.indexOf(current) };
  },

  withinColumn(root, current) {
    const elements = Array.from(
      root.querySelectorAll(
        focusableSelector(
          `[${COLUMN_ATTRIBUTE}="${current.getAttribute(COLUMN_ATTRIBUTE)}"]`
        )
      )
    );
    return { elements, currentIndex: elements.indexOf(current) };
  },

  firstPerRow(root, current) {
    const firstPerRow = new Map<string, Element>();

    for (const element of root.querySelectorAll(
      focusableSelector(`[${ROW_ATTRIBUTE}]`)
    )) {
      firstPerRow.set(element.getAttribute(ROW_ATTRIBUTE) as string, element);
    }

    const currentRow = current.getAttribute(ROW_ATTRIBUTE);

    return {
      elements: Array.from(firstPerRow.values()),
      currentIndex:
        currentRow === null
          ? -1
          : Array.from(firstPerRow.keys()).indexOf(currentRow),
    };
  },

  firstPerColumn(root, current) {
    const firstPerColumn = new Map<string, Element>();

    for (const element of root.querySelectorAll(
      focusableSelector(`[${COLUMN_ATTRIBUTE}]`)
    )) {
      firstPerColumn.set(
        element.getAttribute(COLUMN_ATTRIBUTE) as string,
        element
      );
    }

    const currentColumn = current.getAttribute(COLUMN_ATTRIBUTE);

    return {
      elements: Array.from(firstPerColumn.values()),
      currentIndex:
        currentColumn === null
          ? -1
          : Array.from(firstPerColumn.keys()).indexOf(currentColumn),
    };
  },
} satisfies Record<
  string,
  (root: Element, current: Element) => FocusableElements
>;

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
 *   <div onKeyDown={handleArrowFocus}>
 *     <button />
 *     <button tabIndex={-1} />
 *   </div>
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

  let filter: keyof typeof getFocusable = "all";
  if (axis === "horizontal") {
    if (hasRow) {
      filter = "withinRow";
    } else if (hasColumn) {
      filter = "firstPerColumn";
    }
  } else {
    if (hasColumn) {
      filter = "withinColumn";
    } else if (hasRow) {
      filter = "firstPerRow";
    }
  }

  const focusable = getFocusable[filter](event.currentTarget, target);

  if (focusable.elements.length === 0) {
    return;
  }

  const toFocus = sign === "+" ? next(focusable) : previous(focusable);

  (toFocus as HTMLElement).focus();
};
