import { page } from "@vitest/browser/context";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test } from "vitest";
import "../colors/colors.css";
import { TreeNode } from "./tree";

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

test("selected Navigator rows preserve selection and show hover feedback", async () => {
  const hoverEscape = document.createElement("div");
  hoverEscape.style.height = "20px";
  document.body.append(hoverEscape);
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  for (const mode of ["light", "dark"] as const) {
    document.documentElement.dataset.colorScheme = mode;

    for (const selection of ["selected", "selected-descendant"] as const) {
      await page.elementLocator(hoverEscape).hover();
      act(() => {
        root?.render(
          createElement(TreeNode, {
            level: 1,
            isSelected: selection === "selected",
            isSelectedDescendant: selection === "selected-descendant",
            buttonProps: {},
            action: null,
            children: selection,
          })
        );
      });

      const node = container.querySelector("[data-selection-state]");
      if (node === null) {
        throw new Error("Expected a rendered Tree node");
      }
      const selectedBackground = getComputedStyle(node).backgroundColor;

      await page.elementLocator(node).hover();

      const hoveredStyle = getComputedStyle(node);
      expect(hoveredStyle.backgroundColor, `${mode} ${selection}`).toBe(
        selectedBackground
      );
      expect(hoveredStyle.backgroundImage, `${mode} ${selection}`).not.toBe(
        "none"
      );
    }
  }
});
