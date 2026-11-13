import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";
import "@webstudio-is/design-system/global.css";
import { Tracks } from "./grid-settings.stories";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test.each(["light", "dark"] as const)(
  "keeps Grid settings sections on the panel surface in %s mode",
  (mode) => {
    document.documentElement.dataset.colorScheme = mode;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      act(() => root.render(<Tracks />));

      const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
      const section = dialog?.querySelector<HTMLElement>(
        '[data-floating-panel-container] > [data-state="open"]'
      );
      const stickyHeader = section?.querySelector<HTMLElement>(
        "[data-focus-scope-start] + [data-state]"
      );
      if (
        dialog === null ||
        section === null ||
        section === undefined ||
        stickyHeader === null ||
        stickyHeader === undefined
      ) {
        throw new Error("Expected the open Grid settings panel and section");
      }

      const panelBackground = getComputedStyle(dialog).backgroundColor;
      expect(getComputedStyle(section).backgroundColor).toBe(panelBackground);
      expect(getComputedStyle(stickyHeader).backgroundColor).toBe(
        panelBackground
      );
    } finally {
      act(() => root.unmount());
      container.remove();
      document.documentElement.removeAttribute("data-color-scheme");
    }
  }
);
