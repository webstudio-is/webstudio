import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { expect, test, vi } from "vitest";
import "../colors/colors.css";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test.each(["light", "dark"] as const)(
  "popover uses shared intent colors in %s mode",
  async (mode) => {
    document.documentElement.dataset.colorScheme = mode;
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      act(() =>
        root.render(
          <Popover open>
            <PopoverTrigger>Open</PopoverTrigger>
            <PopoverContent>
              <span
                style={{ color: "var(--foreground-accent)" }}
                data-popover-accent
              >
                Accent
              </span>
              <span
                style={{ color: "var(--foreground-positive)" }}
                data-popover-positive
              >
                Positive
              </span>
              <span
                style={{ color: "var(--foreground-informative)" }}
                data-popover-informative
              >
                Informative
              </span>
            </PopoverContent>
          </Popover>
        )
      );
      await vi.waitFor(() =>
        expect(document.querySelector("[data-popover-accent]")).not.toBeNull()
      );
      const reference = document.createElement("span");
      reference.style.color = "var(--foreground-accent)";
      document.body.append(reference);
      expect(
        getComputedStyle(document.querySelector("[data-popover-accent]")!).color
      ).toBe(getComputedStyle(reference).color);
      for (const intent of ["positive", "informative"] as const) {
        reference.style.color = `var(--foreground-${intent})`;
        expect(
          getComputedStyle(document.querySelector(`[data-popover-${intent}]`)!)
            .color
        ).toBe(getComputedStyle(reference).color);
      }
      reference.remove();
    } finally {
      act(() => root.unmount());
      container.remove();
      document.documentElement.removeAttribute("data-color-scheme");
    }
  }
);
