import { useState } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { expect, test, vi } from "vitest";
import { userEvent } from "@vitest/browser/context";
import { TooltipProvider } from "@webstudio-is/design-system";
import { InputPopover } from "./input-popover";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test("clearing spacing keeps the input focused instead of exposing canvas shortcuts", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let closes = 0;
  const Harness = () => {
    const [open, setOpen] = useState(true);
    return (
      <TooltipProvider>
        <InputPopover
          styleSource="local"
          property="paddingTop"
          value={{ type: "unit", value: 200, unit: "px" }}
          isOpen={open}
          getActiveProperties={() => ["paddingTop"]}
          onClose={() => {
            closes += 1;
            setOpen(false);
          }}
        />
      </TooltipProvider>
    );
  };
  try {
    act(() => root.render(<Harness />));
    await vi.waitFor(() =>
      expect(document.querySelector('input[name="paddingTop"]')).not.toBeNull()
    );
    const input = document.querySelector<HTMLInputElement>(
      'input[name="paddingTop"]'
    )!;
    await userEvent.fill(input, "");
    await userEvent.keyboard("{Backspace}{Backspace}{Backspace}");
    expect(closes).toBe(0);
    expect(document.activeElement).toBe(input);
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});
