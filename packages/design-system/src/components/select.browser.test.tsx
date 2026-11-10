import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { expect, test, vi } from "vitest";
import { userEvent } from "@vitest/browser/context";
import "../colors/colors.css";
import { Select } from "./select";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test("select menu clears the trigger", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    act(() =>
      root.render(<Select options={["Block", "Flex"]} defaultValue="Block" />)
    );
    const trigger = container.querySelector<HTMLButtonElement>("button")!;
    const bottom = trigger.getBoundingClientRect().bottom;
    await act(async () => userEvent.click(trigger));
    await vi.waitFor(() =>
      expect(document.querySelector('[role="listbox"]')).not.toBeNull()
    );
    const list = document.querySelector<HTMLElement>('[role="listbox"]')!;
    expect(list.getBoundingClientRect().top - bottom).toBeGreaterThanOrEqual(4);
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});
