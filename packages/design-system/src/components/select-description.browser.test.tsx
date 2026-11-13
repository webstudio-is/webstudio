import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { userEvent } from "@vitest/browser/context";
import { afterEach, expect, test } from "vitest";
import "../colors/colors.css";
import { Box } from "./box";
import { Select } from "./select";

let root: Root | undefined;
const previousColorScheme =
  document.documentElement.getAttribute("data-color-scheme");

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  if (previousColorScheme === null) {
    document.documentElement.removeAttribute("data-color-scheme");
  } else {
    document.documentElement.setAttribute(
      "data-color-scheme",
      previousColorScheme
    );
  }
});

test.each(["light", "dark"] as const)(
  "Select descriptions wrap inside narrow menus in %s mode",
  async (colorScheme) => {
    document.documentElement.dataset.colorScheme = colorScheme;
    const container = document.createElement("div");
    container.style.width = "180px";
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <Select
          fullWidth
          options={["block", "flex"]}
          value="block"
          getDescription={(option) => (
            <Box css={{ width: "176px" }}>
              {option === "block"
                ? "Displays an element as a block-level element."
                : "Displays an element as a flexible container."}
            </Box>
          )}
        />
      );
    });

    const trigger =
      container.querySelector<HTMLButtonElement>('[role="combobox"]');
    expect(trigger).not.toBeNull();
    await act(async () => await userEvent.click(trigger!));

    const description = document.querySelector<HTMLElement>(
      '[data-select-description="content"]'
    );
    const activeDescription = description?.lastElementChild as HTMLElement;
    expect(description).not.toBeNull();
    expect(activeDescription).not.toBeNull();
    expect(activeDescription.scrollWidth).toBeLessThanOrEqual(
      activeDescription.clientWidth
    );
    expect(activeDescription.scrollHeight).toBeLessThanOrEqual(
      activeDescription.clientHeight
    );
    expect(activeDescription.clientHeight).toBeGreaterThan(
      Number.parseFloat(getComputedStyle(activeDescription).lineHeight)
    );
  }
);
