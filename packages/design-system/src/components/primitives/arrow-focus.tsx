import {
  FocusScope,
  useFocusManager,
  type FocusManagerOptions,
} from "@react-aria/focus";
import type { KeyboardEvent, JSX } from "react";

type Render = (props: {
  handleKeyDown: (
    event: KeyboardEvent,
    focusManagerOptions?: FocusManagerOptions
  ) => void;
  focusManager: ReturnType<typeof useFocusManager>;
}) => JSX.Element;

const willEventMoveCaret = (event: KeyboardEvent) => {
  const { activeElement } = document;

  if (!(activeElement instanceof HTMLInputElement)) {
    return false;
  }

  const { selectionStart, selectionEnd, value } = activeElement;

  // probably never the case, just for TypeScript
  if (selectionStart === null || selectionEnd === null) {
    return true;
  }

  // if some text is selected, arrow keys remove selection
  if (selectionStart !== selectionEnd) {
    return true;
  }

  // if caret at the end, right and down will not move it
  if (
    selectionEnd === value.length &&
    (event.key === "ArrowRight" || event.key === "ArrowDown")
  ) {
    return false;
  }

  // if caret at the start, left and up will not move it
  if (
    selectionStart === 0 &&
    (event.key === "ArrowLeft" || event.key === "ArrowUp")
  ) {
    return false;
  }

  return true;
};

const accept = (element: Element) => {
  // In some cases we want to have an element that is tabbable, but it should not be ignored for arrow focus management.
  // One use case is in input field, which is using ESC to focus an div to unfocus the input
  return element.hasAttribute("data-no-arrow-focus") === false;
};

// Need this wrapper becuase we can't call useFocusManager
// in the same component that renders FocusScope
const ContextHelper = ({ render }: { render: Render }) => {
  const focusManager = useFocusManager();

  return render({
    handleKeyDown: (
      event: KeyboardEvent,
      focusManagerOptions?: FocusManagerOptions
    ) => {
      if (event.defaultPrevented) {
        return;
      }

      if (
        event.target instanceof Element &&
        false === event.currentTarget.contains(event.target)
      ) {
        // Event occurs inside a portal, typically within a popover or dialog, but the handler is outside the popover/dialog.
        // Ignore these events as they do not affect focus outside the dialog.
        return;
      }

      if (willEventMoveCaret(event)) {
        return;
      }

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        focusManager?.focusNext({ wrap: true, accept, ...focusManagerOptions });
        event.preventDefault(); // Prevents the page from scrolling
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        focusManager?.focusPrevious({
          wrap: true,
          accept,
          ...focusManagerOptions,
        });
        event.preventDefault(); // Prevents the page from scrolling
      }
    },
    focusManager,
  });
};

export const ArrowFocus = ({ render }: { render: Render }) => (
  <FocusScope>
    <ContextHelper render={render} />
  </FocusScope>
);
