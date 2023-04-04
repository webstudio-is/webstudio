import {
  FocusScope,
  useFocusManager,
  type FocusManagerOptions,
} from "@react-aria/focus";
import type { KeyboardEvent } from "react";

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

// Need this wrapper becuase we can't call useFocusManager
// in the same component that renders FocusScope
const ContextHelper = ({ render }: { render: Render }) => {
  const focusManager = useFocusManager();

  return render({
    handleKeyDown: (
      event: KeyboardEvent,
      focusManagerOptions?: FocusManagerOptions
    ) => {
      if (willEventMoveCaret(event)) {
        return;
      }

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        focusManager.focusNext({ wrap: true, ...focusManagerOptions });
        event.preventDefault(); // Prevents the page from scrolling
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        focusManager.focusPrevious({ wrap: true, ...focusManagerOptions });
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
