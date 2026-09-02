import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test } from "vitest";
import "../colors/colors.css";
import {
  Command,
  CommandGroup,
  CommandGroupHeading,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";

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

test("command panels use the panel surface and readable group headings", () => {
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
            Command,
            null,
            createElement(CommandInput),
            createElement(
              CommandList,
              null,
              createElement(
                CommandGroup,
                {
                  name: "commands",
                  actions: [],
                  heading: createElement(
                    CommandGroupHeading,
                    null,
                    "Commands (39)"
                  ),
                },
                createElement(CommandItem, { value: "example" }, "Example")
              )
            )
          )
        )
      );
    });

    const panel = container.querySelector("[cmdk-root]");
    const inputContainer = container.querySelector(
      "[data-input-field-input]"
    )?.parentElement;
    const heading = container.querySelector("[cmdk-group-heading]");
    const panelReference = container.firstElementChild;
    if (
      panel === null ||
      inputContainer === null ||
      inputContainer === undefined ||
      heading === null ||
      panelReference === null
    ) {
      throw new Error("Expected a rendered command group");
    }

    const panelBackground = readColor(getComputedStyle(panel).backgroundColor);
    expect(panelBackground, `${mode} panel surface`).toEqual(
      readColor(getComputedStyle(panelReference).backgroundColor)
    );
    expect(
      readColor(getComputedStyle(inputContainer).backgroundColor),
      `${mode} command input surface`
    ).toEqual(panelBackground);
    expect(
      contrast(readColor(getComputedStyle(heading).color), panelBackground),
      `${mode} heading contrast`
    ).toBeGreaterThanOrEqual(4.5);
  }
});
