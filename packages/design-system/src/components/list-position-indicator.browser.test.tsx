import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test } from "vitest";
import "../colors/colors.css";
import {
  ListPositionIndicator,
  TreePositionIndicator,
} from "./list-position-indicator";

let root: Root | undefined;

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-color-scheme");
});

test.each(["light", "dark"])(
  "drop indicators use only blue with a transparent circle in %s mode",
  (mode) => {
    document.documentElement.dataset.colorScheme = mode;
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root?.render(
        createElement(
          "div",
          null,
          createElement(
            "div",
            { "data-indicator": "list" },
            createElement(ListPositionIndicator, { x: 0, y: 0, length: 100 })
          ),
          createElement(
            "div",
            { "data-indicator": "tree" },
            createElement(TreePositionIndicator, { x: 0, y: 0, length: 100 })
          )
        )
      );
    });

    const sample = document.createElement("div");
    sample.style.backgroundColor = "var(--background-accent)";
    document.body.append(sample);
    const blue = getComputedStyle(sample).backgroundColor;
    sample.remove();

    for (const kind of ["list", "tree"]) {
      const indicator = container.querySelector(`[data-indicator="${kind}"]`)!;
      const styles = Array.from(indicator.querySelectorAll("div"), (element) =>
        getComputedStyle(element)
      );
      expect(styles.some((style) => style.backgroundColor === blue)).toBe(true);
      for (const style of styles) {
        expect(style.outlineStyle, `${mode} ${kind} outline`).toBe("none");
        expect(["rgba(0, 0, 0, 0)", blue], `${mode} ${kind} fill`).toContain(
          style.backgroundColor
        );
      }
      if (kind === "tree") {
        const circle = styles.find((style) => style.borderTopWidth === "2px");
        expect(circle?.borderTopColor).toBe(blue);
        expect(circle?.backgroundColor).toBe("rgba(0, 0, 0, 0)");
      }
    }
  }
);
