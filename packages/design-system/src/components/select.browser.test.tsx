import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { expect, test, vi } from "vitest";
import { userEvent } from "@vitest/browser/context";
import "../colors/colors.css";
import { Select } from "./select";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test.each(["light", "dark"] as const)(
  "select menu clears the trigger and separates from it in %s mode",
  async (mode) => {
    document.documentElement.dataset.colorScheme = mode;
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
      expect(list.getBoundingClientRect().top - bottom).toBeGreaterThanOrEqual(
        4
      );
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d")!;
      const brightness = (element: Element) => {
        context.fillStyle = getComputedStyle(element).backgroundColor;
        context.fillRect(0, 0, 1, 1);
        return Array.from(context.getImageData(0, 0, 1, 1).data)
          .slice(0, 3)
          .reduce((sum, channel) => sum + channel, 0);
      };
      const panel = document.createElement("div");
      panel.style.backgroundColor = "var(--background-primary)";
      document.body.append(panel);
      expect(
        mode === "light"
          ? brightness(list) < brightness(panel)
          : brightness(list) > brightness(panel)
      ).toBe(true);
      panel.remove();
    } finally {
      act(() => root.unmount());
      container.remove();
      document.documentElement.removeAttribute("data-color-scheme");
    }
  }
);
