import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test } from "vitest";
import "../colors/colors.css";
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

const luminance = (color: number[]) => {
  const linearize = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * linearize(color[0]) +
    0.7152 * linearize(color[1]) +
    0.0722 * linearize(color[2])
  );
};

const contrast = (first: number[], second: number[]) => {
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05)
  );
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
          )
        )
      );
    });

    const background = getComputedStyle(
      container.firstElementChild as Element
    ).backgroundColor;
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
    expect(
      contrast(
        readColor(getComputedStyle(switchControl, "::before").backgroundColor),
        readColor(background)
      ),
      `${mode} switch`
    ).toBeGreaterThanOrEqual(3);
  }
});
