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

// Need this wrapper becuase we can't call useFocusManager
// in the same component that renders FocusScope
const ContextHelper = ({ render }: { render: Render }) => {
  const focusManager = useFocusManager();

  return render({
    handleKeyDown: (
      event: KeyboardEvent,
      focusManagerOptions?: FocusManagerOptions
    ) => {
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
