import { commands, page } from "@vitest/browser/context";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test } from "vitest";
import "../colors/colors.css";
import { Button } from "./button";
import { PanelTabs, PanelTabsList, PanelTabsTrigger } from "./panel-tabs";

let root: Root | undefined;

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-color-scheme");
  document.documentElement.removeAttribute("style");
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

const readRenderedBackground = async (element: Element) => {
  const { base64, path } = await page
    .elementLocator(element)
    .screenshot({ base64: true });
  await commands.removeFile(path);
  const image = new Image();
  image.src = `data:image/png;base64,${base64}`;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (context === null) {
    throw new Error("Canvas screenshot evaluation is unavailable");
  }
  context.drawImage(image, 0, 0);
  return [0.25, 0.5, 0.75].map((position) =>
    Array.from(
      context.getImageData(
        Math.floor(image.width * position),
        Math.floor(image.height / 2),
        1,
        1
      ).data
    )
  );
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

test("strong button interaction states preserve text contrast", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  const themeColors = ["oklch(0% 0.4 0)", "oklch(100% 0.4 60)"];
  const variants = [
    ["primary", "accent"],
    ["destructive", "negative"],
  ] as const;

  for (const mode of ["light", "dark"] as const) {
    document.documentElement.dataset.colorScheme = mode;

    for (const themeColor of themeColors) {
      for (const [variant, themeColorName] of variants) {
        document.documentElement.style.setProperty(
          `--theme-color-${themeColorName}`,
          themeColor
        );

        for (const state of ["hover", "pressed"] as const) {
          act(() => {
            root?.render(
              createElement(Button, {
                "aria-label": variant,
                color: variant,
                state,
                css: { width: 20, height: 20, padding: 0 },
              })
            );
          });

          const button = container.querySelector("button");
          if (button === null) {
            throw new Error("Expected a rendered button");
          }

          const style = getComputedStyle(button);
          expect(style.backgroundImage, `${mode} ${variant} ${state}`).not.toBe(
            "none"
          );
          for (const background of await readRenderedBackground(button)) {
            expect(
              contrast(readColor(style.color), background),
              `${mode} ${variant} ${state} with ${themeColor}`
            ).toBeGreaterThanOrEqual(4.5);
          }
        }
      }
    }
  }
});

test("inactive panel tabs remain readable", () => {
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
            PanelTabs,
            { defaultValue: "active" },
            createElement(
              PanelTabsList,
              null,
              createElement(PanelTabsTrigger, { value: "active" }, "Active"),
              createElement(PanelTabsTrigger, { value: "inactive" }, "Inactive")
            )
          )
        )
      );
    });

    const inactiveTab = container.querySelector('[data-state="inactive"]');
    if (inactiveTab === null) {
      throw new Error("Expected an inactive tab");
    }
    const backgroundElement = container.firstElementChild;
    if (backgroundElement === null) {
      throw new Error("Expected a tab background");
    }
    const background = getComputedStyle(backgroundElement).backgroundColor;
    const foreground = getComputedStyle(inactiveTab).color;
    expect(
      contrast(readColor(foreground), readColor(background)),
      mode
    ).toBeGreaterThanOrEqual(4.5);
  }
});
