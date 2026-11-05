import { composeStories } from "@storybook/react";
import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";
import {
  selectedItemBackground,
  TooltipProvider,
} from "@webstudio-is/design-system";
import "@webstudio-is/design-system/global.css";
import * as stories from "./expression-editor.stories";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const { Autocomplete } = composeStories(stories);

test.each(["light", "dark"])(
  "the autocomplete story opens selected suggestions in %s mode",
  async (scheme) => {
    const previousScheme =
      document.documentElement.getAttribute("data-color-scheme");
    document.documentElement.setAttribute("data-color-scheme", scheme);
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      await act(async () =>
        root.render(
          <TooltipProvider>
            <Autocomplete />
          </TooltipProvider>
        )
      );
      const options = () =>
        document.querySelectorAll<HTMLElement>(
          '.cm-tooltip-autocomplete [role="option"]'
        );
      await vi.waitFor(() => expect(options()).toHaveLength(3));
      const editor = container.querySelector<HTMLElement>('[role="textbox"]')!;
      expect(document.activeElement).toBe(editor);
      const selected = document.querySelector<HTMLElement>(
        '.cm-tooltip-autocomplete [aria-selected="true"]'
      )!;
      const unselected = document.querySelector<HTMLElement>(
        '.cm-tooltip-autocomplete [role="option"]:not([aria-selected="true"])'
      )!;
      expect(selected).not.toBeNull();
      const reference = document.createElement("div");
      reference.style.backgroundColor = selectedItemBackground;
      container.appendChild(reference);
      expect(getComputedStyle(selected).backgroundColor).toBe(
        getComputedStyle(reference).backgroundColor
      );
      expect(getComputedStyle(selected).backgroundColor).not.toBe(
        getComputedStyle(unselected).backgroundColor
      );
    } finally {
      await act(async () => root.unmount());
      container.remove();
      if (previousScheme === null) {
        document.documentElement.removeAttribute("data-color-scheme");
      } else {
        document.documentElement.setAttribute(
          "data-color-scheme",
          previousScheme
        );
      }
    }
  }
);
