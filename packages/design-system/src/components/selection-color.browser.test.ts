import { afterEach, expect, test } from "vitest";
import "../colors/colors.css";
import { selectionBackground } from "./selection-color";

const root = document.documentElement;
const previousMode = root.getAttribute("data-color-scheme");

afterEach(() => {
  if (previousMode === null) {
    root.removeAttribute("data-color-scheme");
  } else {
    root.setAttribute("data-color-scheme", previousMode);
  }
  document.body.replaceChildren();
});

test.each(["light", "dark"] as const)(
  "uses the shared selection color for native editors in %s mode",
  (mode) => {
    root.dataset.colorScheme = mode;
    const reference = document.createElement("span");
    reference.style.backgroundColor = selectionBackground;
    reference.style.color = "var(--foreground-on-selection)";
    document.body.append(reference);
    const expectedBackground = getComputedStyle(reference).backgroundColor;
    const expectedForeground = getComputedStyle(reference).color;

    for (const editor of [
      document.createElement("input"),
      document.createElement("textarea"),
      document.createElement("div"),
    ]) {
      editor.contentEditable = "true";
      document.body.append(editor);

      expect(
        getComputedStyle(editor, "::selection").backgroundColor,
        editor.tagName.toLowerCase()
      ).toBe(expectedBackground);
      expect(
        getComputedStyle(editor, "::selection").color,
        editor.tagName.toLowerCase()
      ).toBe(expectedForeground);
    }
  }
);
