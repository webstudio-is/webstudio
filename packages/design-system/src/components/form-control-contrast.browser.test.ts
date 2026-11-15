import { page, userEvent } from "@vitest/browser/context";
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

const readTokenColor = (name: string) => {
  const sample = document.createElement("span");
  sample.style.color = `var(${name})`;
  document.body.append(sample);
  const color = readColor(getComputedStyle(sample).color);
  sample.remove();
  return color;
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

const expectCheckboxContrast = (checkbox: Element, state: string) => {
  const style = getComputedStyle(checkbox);
  const border = readColor(style.borderColor);
  expect(border[3], `${state} border opacity`).toBe(255);
  expect(
    contrast(border, readColor(style.backgroundColor)),
    `${state} border contrast`
  ).toBeGreaterThanOrEqual(3);
};

test("compact form controls keep their intended contrast", async () => {
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
          createElement(Checkbox, {
            "aria-label": "Checked checkbox",
            checked: true,
          }),
          createElement(Checkbox, {
            "aria-label": "Disabled checkbox",
            disabled: true,
          }),
          createElement(
            "div",
            { "data-switch": true },
            createElement(Switch, { "aria-label": "Switch" })
          ),
          createElement(
            "div",
            { "data-disabled-switch": true },
            createElement(Switch, {
              "aria-label": "Disabled switch",
              disabled: true,
            })
          ),
          createElement(
            "div",
            { "data-checked-switch": true },
            createElement(Switch, {
              "aria-label": "Checked switch",
              checked: true,
            })
          ),
          createElement(
            "div",
            { "data-neutral-control": true },
            createElement(Button, { color: "neutral" }, "Neutral")
          )
        )
      );
    });

    const checkbox = container.querySelector<HTMLButtonElement>(
      "[data-control] > button"
    );
    if (checkbox === null) {
      throw new Error("Expected a checkbox");
    }
    act(() => checkbox.blur());
    await page.getByText("Neutral").hover();
    expect(checkbox.matches(":hover, :focus-visible")).toBe(false);
    expectCheckboxContrast(checkbox, `${mode} resting checkbox`);
    const checkedCheckbox = container.querySelector<HTMLButtonElement>(
      '[aria-label="Checked checkbox"]'
    );
    const disabledCheckbox = container.querySelector<HTMLButtonElement>(
      '[aria-label="Disabled checkbox"]'
    );
    if (checkedCheckbox === null || disabledCheckbox === null) {
      throw new Error("Expected checked and disabled checkboxes");
    }
    expectCheckboxContrast(checkedCheckbox, `${mode} checked checkbox`);
    expectCheckboxContrast(disabledCheckbox, `${mode} disabled checkbox`);
    await page.elementLocator(checkbox).hover();
    expect(checkbox.matches(":hover")).toBe(true);
    expectCheckboxContrast(checkbox, `${mode} hovered checkbox`);
    act(() => checkedCheckbox.focus());
    await act(async () => userEvent.keyboard("{Shift>}{Tab}{/Shift}"));
    expect(checkbox.matches(":focus-visible")).toBe(true);
    expect(readColor(getComputedStyle(checkbox).borderColor)).toEqual(
      readTokenColor("--border-focus")
    );
    expectCheckboxContrast(checkbox, `${mode} focused checkbox`);

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
    ).toEqual(readTokenColor("--foreground-disabled"));
    const disabledSwitch = container.querySelector(
      "[data-disabled-switch] > button"
    );
    const checkedSwitch = container.querySelector(
      "[data-checked-switch] > button"
    );
    if (disabledSwitch === null || checkedSwitch === null) {
      throw new Error("Expected disabled and checked switches");
    }
    expect(
      readColor(getComputedStyle(disabledSwitch, "::before").backgroundColor),
      `${mode} disabled switch track`
    ).toEqual(readColor(getComputedStyle(neutralControl).backgroundColor));
    expect(
      readColor(getComputedStyle(checkedSwitch, "::before").backgroundColor),
      `${mode} checked switch track`
    ).toEqual(readTokenColor("--background-accent"));
  }
});
