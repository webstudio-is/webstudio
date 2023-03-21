import { FocusScope, useFocusManager } from "@react-aria/focus";
import type { KeyboardEvent } from "react";

type Render = (props: {
  handleKeyDown: (event: KeyboardEvent) => void;
  focusManager: ReturnType<typeof useFocusManager>;
}) => JSX.Element;

// Need this wrapper becuase we can't call useFocusManager
// in the same component that renders FocusScope
const ContextHelper = ({ render }: { render: Render }) => {
  const focusManager = useFocusManager();

  return render({
    handleKeyDown: (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        focusManager.focusNext({ wrap: true });
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        focusManager.focusPrevious({ wrap: true });
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
