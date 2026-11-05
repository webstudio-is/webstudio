import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { expect, test, vi } from "vitest";
import { userEvent } from "@vitest/browser/context";
import { TooltipProvider } from "@webstudio-is/design-system";
import { __testing__ } from "./breakpoints-editor";

const { BreakpointEditorItem } = __testing__;
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test.each(["enter", "tab", "click"])(
  "keeps the breakpoint draft until %s commits it",
  async (commit) => {
    const onChangeComplete = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      act(() =>
        root.render(
          <TooltipProvider>
            <BreakpointEditorItem
              breakpoint={{ id: "tablet", label: "Tablet", maxWidth: 991 }}
              onChangeComplete={onChangeComplete}
              onDelete={() => {}}
            />
          </TooltipProvider>
        )
      );
      const input = container.querySelector<HTMLInputElement>(
        '[aria-label="Breakpoint width"]'
      )!;
      await act(async () => {
        await userEvent.fill(input, "8");
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 650));
      });
      expect(onChangeComplete).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(input);
      await act(async () => {
        await userEvent.fill(input, "899");
      });
      await act(async () => {
        if (commit === "click") {
          await userEvent.click(
            container.querySelector<HTMLInputElement>(
              'input[placeholder="Breakpoint name"]'
            )!
          );
        } else {
          await userEvent.keyboard(commit === "enter" ? "{Enter}" : "{Tab}");
        }
      });
      expect(onChangeComplete).toHaveBeenLastCalledWith({
        id: "tablet",
        label: "Tablet",
        maxWidth: 899,
      });
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  }
);
