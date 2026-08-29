import { commands, page } from "@vitest/browser/context";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test } from "vitest";
import "../colors/colors.css";
import { Button, LinkButton } from "./button";
import { PanelTabs, PanelTabsList, PanelTabsTrigger } from "./panel-tabs";
import { SmallToggleButton } from "./small-toggle-button";
import { ToggleGroup, ToggleGroupButton } from "./toggle-group";
import {
  Toolbar,
  ToolbarButton,
  ToolbarToggleGroup,
  ToolbarToggleItem,
} from "./toolbar";

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

test("link buttons use anchor semantics and button interaction states", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root?.render(
      createElement(
        LinkButton,
        {
          href: "https://example.com/path",
          state: "hover",
          target: "_blank",
        },
        "Open"
      )
    );
  });

  const link = container.querySelector("a");
  if (link === null) {
    throw new Error("Expected LinkButton to render an anchor");
  }
  expect(link.href).toBe("https://example.com/path");
  expect(link.target).toBe("_blank");
  expect(link.dataset.state).toBe("hover");
  expect(getComputedStyle(link).backgroundImage).not.toBe("none");

  act(() => {
    root?.render(
      createElement(LinkButton, { color: "primary", href: "/next" }, "Next")
    );
  });
  const autoLink = container.querySelector("a");
  if (autoLink === null) {
    throw new Error("Expected an automatic LinkButton state");
  }
  expect(autoLink.dataset.state).toBe("auto");
  expect(getComputedStyle(autoLink).backgroundImage).toBe("none");
  await page.elementLocator(autoLink).hover();
  expect(getComputedStyle(autoLink).backgroundImage).not.toBe("none");
});

test("toggle group states remain distinguishable", () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  for (const mode of ["light", "dark"] as const) {
    document.documentElement.dataset.colorScheme = mode;
    act(() => {
      root?.render(
        createElement(
          ToggleGroup,
          { type: "single", defaultValue: "selected" },
          createElement(ToggleGroupButton, { value: "selected" }, "Selected"),
          createElement(ToggleGroupButton, { value: "inactive" }, "Inactive")
        )
      );
    });

    const selected = container.querySelector('[data-state="on"]');
    const inactive = container.querySelector('[data-state="off"]');
    const group = container.querySelector('[role="group"]');
    if (selected === null || inactive === null || group === null) {
      throw new Error(
        "Expected a toggle group with selected and inactive items"
      );
    }

    const selectedStyle = getComputedStyle(selected);
    const inactiveStyle = getComputedStyle(inactive);
    const groupStyle = getComputedStyle(group);

    expect(
      contrast(
        readColor(selectedStyle.backgroundColor),
        readColor(groupStyle.backgroundColor)
      ),
      `${mode} selected surface`
    ).toBeGreaterThanOrEqual(1.2);
    expect(
      contrast(readColor(selectedStyle.color), readColor(inactiveStyle.color)),
      `${mode} foreground states`
    ).toBeGreaterThanOrEqual(1.5);
  }
});

test("small toggle selections remain distinguishable", () => {
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
          createElement(SmallToggleButton, {
            "aria-label": "Selected small toggle",
            icon: "Selected",
            pressed: true,
          }),
          createElement(SmallToggleButton, {
            "aria-label": "Inactive small toggle",
            icon: "Inactive",
            pressed: false,
          })
        )
      );
    });

    const background = container.firstElementChild;
    const smallSelected = container.querySelector(
      '[aria-label="Selected small toggle"]'
    );
    const smallInactive = container.querySelector(
      '[aria-label="Inactive small toggle"]'
    );
    if (
      background === null ||
      smallSelected === null ||
      smallInactive === null
    ) {
      throw new Error("Expected rendered small toggle states");
    }

    const backgroundColor = readColor(
      getComputedStyle(background).backgroundColor
    );
    const selectedStyle = getComputedStyle(smallSelected);
    const inactiveStyle = getComputedStyle(smallInactive);
    expect(
      contrast(readColor(selectedStyle.backgroundColor), backgroundColor),
      `${mode} selected surface`
    ).toBeGreaterThanOrEqual(1.2);
    expect(
      contrast(readColor(selectedStyle.color), readColor(inactiveStyle.color)),
      `${mode} foreground states`
    ).toBeGreaterThanOrEqual(1.5);
  }
});

test("square toolbar actions and toggles share open and selected surfaces", () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  for (const mode of ["light", "dark"] as const) {
    document.documentElement.dataset.colorScheme = mode;
    act(() => {
      root?.render(
        createElement(
          Toolbar,
          null,
          createElement(
            ToolbarButton,
            {
              "aria-label": "Open toolbar action",
              "aria-expanded": true,
            },
            "Action"
          ),
          createElement(
            ToolbarButton,
            { "aria-label": "Idle toolbar action" },
            "Idle"
          ),
          createElement(
            ToolbarToggleGroup,
            { type: "single", value: "selected" },
            createElement(
              ToolbarToggleItem,
              {
                "aria-label": "Selected chrome toggle",
                value: "selected",
              },
              "Selected"
            )
          )
        )
      );
    });

    const openAction = container.querySelector(
      '[aria-label="Open toolbar action"]'
    );
    const selectedToggle = container.querySelector(
      '[aria-label="Selected chrome toggle"]'
    );
    const idleAction = container.querySelector(
      '[aria-label="Idle toolbar action"]'
    );
    if (openAction === null || selectedToggle === null || idleAction === null) {
      throw new Error("Expected rendered toolbar controls");
    }

    const actionStyle = getComputedStyle(openAction);
    const toggleStyle = getComputedStyle(selectedToggle);
    expect(
      readColor(toggleStyle.backgroundColor),
      `${mode} background`
    ).toEqual(readColor(actionStyle.backgroundColor));
    expect(readColor(toggleStyle.color), `${mode} foreground`).toEqual(
      readColor(actionStyle.color)
    );
    expect(
      readColor(getComputedStyle(idleAction).backgroundColor)[3],
      `${mode} idle background`
    ).toBe(0);
  }
});
