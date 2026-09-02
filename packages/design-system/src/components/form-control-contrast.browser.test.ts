import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test } from "vitest";
import "../colors/colors.css";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { Switch } from "./switch";

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

const readColor = (color: string) => {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (context === null) {
    throw new Error("Canvas color evaluation is unavailable");
  }
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  return Array.from(context.getImageData(0, 0, 1, 1).data);
};

test("compact form controls use their intended resting treatment", () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  for (const mode of ["light", "dark"] as const) {
    document.documentElement.dataset.colorScheme = mode;
    act(() => {
      root?.render(
        createElement(
          "div",
          { style: { background: "var(--background-primary)" } },
          createElement(
            "div",
            { "data-control": "checkbox" },
            createElement(Checkbox, { "aria-label": "Checkbox" })
          ),
          createElement(
            "div",
            { "data-switch": true },
            createElement(Switch, { "aria-label": "Switch" })
          ),
          createElement(
            "div",
            { "data-neutral-control": true },
            createElement(Button, { color: "neutral" }, "Neutral")
          )
        )
      );
    });

    const checkbox = container.querySelector("[data-control] > button");
    if (checkbox === null) {
      throw new Error("Expected a checkbox");
    }
    expect(
      readColor(getComputedStyle(checkbox).borderColor)[3],
      `${mode} checkbox resting border`
    ).toBe(0);

    const switchControl = container.querySelector("[data-switch] > button");
    if (switchControl === null) {
      throw new Error("Expected a switch");
    }
    const neutralControl = container.querySelector(
      "[data-neutral-control] > button"
    );
    if (neutralControl === null) {
      throw new Error("Expected a neutral control");
    }
    expect(
      readColor(getComputedStyle(switchControl, "::before").backgroundColor),
      `${mode} switch resting track`
    ).toEqual(readColor(getComputedStyle(neutralControl).backgroundColor));
  }
});
