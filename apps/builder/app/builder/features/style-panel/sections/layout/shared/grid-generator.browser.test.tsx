import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import "@webstudio-is/design-system/global.css";
import { Open } from "./grid-generator.stories";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const luminance = (value: string) => {
  const context = document.createElement("canvas").getContext("2d");
  if (context === null) {
    throw new Error("Expected canvas color evaluation");
  }
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
  const linear = (channel: number) => {
    const scaled = channel / 255;
    return scaled <= 0.04045
      ? scaled / 12.92
      : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
};

test.each(["light", "dark"] as const)(
  "keeps grid cells and preset diagrams visible in %s mode",
  (mode) => {
    document.documentElement.dataset.colorScheme = mode;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      act(() =>
        root.render(
          <TooltipProvider>
            <Open />
          </TooltipProvider>
        )
      );

      const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
      const cells = dialog?.querySelectorAll<HTMLButtonElement>("button");
      const preset = Array.from(cells ?? []).find((button) =>
        button.textContent?.includes("Fluid sidebar")
      );
      const preview = preset?.querySelector<HTMLElement>("div");
      const previewCell = preview?.querySelector<HTMLElement>("div");
      if (
        dialog === null ||
        cells === undefined ||
        preview === null ||
        preview === undefined ||
        previewCell === null ||
        previewCell === undefined
      ) {
        throw new Error("Expected the open grid generator and preset preview");
      }

      const gridPreview = container.querySelector<HTMLButtonElement>("button");
      const gridLine = gridPreview?.firstElementChild;
      if (
        gridPreview === null ||
        gridPreview === undefined ||
        gridLine === null ||
        gridLine === undefined
      ) {
        throw new Error("Expected the grid preview and a cell line");
      }
      expect(getComputedStyle(gridPreview).outlineColor).toBe(
        getComputedStyle(gridLine).borderRightColor
      );

      for (const [border, background] of [
        [
          getComputedStyle(cells[4]).borderColor,
          getComputedStyle(dialog).backgroundColor,
        ],
        [
          getComputedStyle(previewCell).borderColor,
          getComputedStyle(previewCell).backgroundColor,
        ],
      ]) {
        const surface = luminance(background);
        const stroke = luminance(border);
        const ratio =
          (Math.max(surface, stroke) + 0.05) /
          (Math.min(surface, stroke) + 0.05);
        expect(ratio).toBeGreaterThanOrEqual(3);
      }
    } finally {
      act(() => root.unmount());
      container.remove();
      document.documentElement.removeAttribute("data-color-scheme");
    }
  }
);
