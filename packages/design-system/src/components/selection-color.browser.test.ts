import { afterEach, expect, test } from "vitest";
import { cssVar } from "../css-var";
import "../colors/colors.css";
import "./text-selection.css";
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
    reference.style.backgroundColor = cssVar("--background-text-selection");
    reference.style.color = "var(--foreground-on-text-selection)";
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

test.each(["light", "dark"] as const)(
  "keeps control selection separate from text selection in %s mode",
  (mode) => {
    root.dataset.colorScheme = mode;
    const control = document.createElement("span");
    control.style.background = selectionBackground;
    const text = document.createElement("span");
    text.style.background = cssVar("--background-text-selection");
    document.body.append(control, text);

    expect(getComputedStyle(control).backgroundColor).not.toBe(
      getComputedStyle(text).backgroundColor
    );
  }
);
