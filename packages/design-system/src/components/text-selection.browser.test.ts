import { afterEach, expect, test } from "vitest";
import { cssVar } from "../css-var";
import { rawTheme } from "../stitches.config";
import "../global.css";
import { selectedItemBackground } from "./component-state-color";

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
  "applies the shared document defaults in %s mode",
  (mode) => {
    root.dataset.colorScheme = mode;
    const reference = document.createElement("span");
    reference.style.color = cssVar("--foreground-primary");
    reference.style.fontFamily = rawTheme.fonts.sans;
    document.body.append(reference);

    const bodyStyle = getComputedStyle(document.body);
    const referenceStyle = getComputedStyle(reference);
    expect(bodyStyle.margin).toBe("0px");
    expect(bodyStyle.color).toBe(referenceStyle.color);
    expect(bodyStyle.fontFamily).toBe(referenceStyle.fontFamily);
  }
);

test.each(["light", "dark"] as const)(
  "uses the shared text selection colors for native editors in %s mode",
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
  "keeps selected item backgrounds separate from text selection in %s mode",
  (mode) => {
    root.dataset.colorScheme = mode;
    const selectedItem = document.createElement("span");
    selectedItem.style.background = selectedItemBackground;
    const textSelection = document.createElement("span");
    textSelection.style.background = cssVar("--background-text-selection");
    document.body.append(selectedItem, textSelection);

    expect(getComputedStyle(selectedItem).backgroundColor).not.toBe(
      getComputedStyle(textSelection).backgroundColor
    );
  }
);
