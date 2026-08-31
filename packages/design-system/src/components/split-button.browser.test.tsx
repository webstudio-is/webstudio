import { page } from "@vitest/browser/context";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test } from "vitest";
import "../colors/colors.css";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { SplitButton, SplitButtonMenuButton } from "./split-button";
import { Tooltip, TooltipProvider } from "./tooltip";
import { IconToggleButton } from "./toggle-button";

let root: Root | undefined;

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

const renderSplitButton = ({
  pressed = false,
  previewDisabled = false,
  menuDisabled = false,
  onPreviewClick,
}: {
  pressed?: boolean;
  previewDisabled?: boolean;
  menuDisabled?: boolean;
  onPreviewClick?: () => void;
} = {}) => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root?.render(
      <TooltipProvider delayDuration={0}>
        <SplitButton>
          <Tooltip content="Toggle preview" open={false}>
            <IconToggleButton
              aria-label="Toggle preview"
              disabled={previewDisabled}
              onClick={onPreviewClick}
              pressed={pressed}
            >
              P
            </IconToggleButton>
          </Tooltip>
          <DropdownMenu>
            <Tooltip content="Choose mode" open={false}>
              <DropdownMenuTrigger asChild>
                <SplitButtonMenuButton
                  aria-label="Choose mode"
                  disabled={menuDisabled}
                  type="button"
                >
                  <svg width="16" height="16" />
                </SplitButtonMenuButton>
              </DropdownMenuTrigger>
            </Tooltip>
            <DropdownMenuContent>
              <DropdownMenuItem>Design</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SplitButton>
      </TooltipProvider>
    );
  });

  return {
    buttons: Array.from(container.querySelectorAll("button")),
    container,
  };
};

test("split button segments share hover in the real menu composition", async () => {
  for (const pressed of [false, true]) {
    const { buttons, container } = renderSplitButton({ pressed });

    expect(buttons).toHaveLength(2);
    expect(buttons[0].getAttribute("aria-label")).toBe("Toggle preview");
    expect(buttons[1].getAttribute("aria-label")).toBe("Choose mode");

    for (const button of buttons) {
      await page.elementLocator(button).hover();

      const backgrounds = buttons.map(
        (segment, index) =>
          getComputedStyle(segment, index === 0 ? undefined : "::before")
            .backgroundColor
      );
      expect(backgrounds[0]).toBe(backgrounds[1]);
      expect(backgrounds[0]).not.toBe("rgba(0, 0, 0, 0)");
    }

    await page.elementLocator(container).hover({
      position: {
        x: buttons[0].getBoundingClientRect().width + 0.5,
        y: buttons[0].getBoundingClientRect().height / 2,
      },
    });
    const gapHoverBackgrounds = buttons.map(
      (segment, index) =>
        getComputedStyle(segment, index === 0 ? undefined : "::before")
          .backgroundColor
    );
    expect(gapHoverBackgrounds[0]).toBe(gapHoverBackgrounds[1]);
    expect(gapHoverBackgrounds[0]).not.toBe("rgba(0, 0, 0, 0)");

    const chevron = buttons[1].querySelector("svg");
    expect(chevron).not.toBeNull();
    const menuRect = buttons[1].getBoundingClientRect();
    const menuVisualStyle = getComputedStyle(buttons[1], "::before");
    expect(Number.parseFloat(menuVisualStyle.width)).toBe(
      chevron?.getBoundingClientRect().width
    );
    expect(Number.parseFloat(menuVisualStyle.width)).toBeLessThan(
      buttons[0].getBoundingClientRect().width
    );
    expect(menuRect.width).toBe(24);

    const firstStyle = getComputedStyle(buttons[0]);
    const secondStyle = getComputedStyle(buttons[1]);
    expect(firstStyle.borderTopRightRadius).toBe("0px");
    expect(firstStyle.borderBottomRightRadius).toBe("0px");
    expect(secondStyle.borderTopLeftRadius).toBe("0px");
    expect(secondStyle.borderBottomLeftRadius).toBe("0px");

    expect(document.elementFromPoint(menuRect.left + 1, menuRect.top + 2)).toBe(
      buttons[1]
    );
    expect(
      document.elementFromPoint(menuRect.right - 1, menuRect.top + 2)
    ).toBe(buttons[1]);

    act(() => root?.unmount());
    root = undefined;
  }
});

test("split button segments share the active state", () => {
  const { buttons } = renderSplitButton({ pressed: true });
  const previewBackground = getComputedStyle(buttons[0]).backgroundColor;
  const menuBackground = getComputedStyle(
    buttons[1],
    "::before"
  ).backgroundColor;

  expect(menuBackground).toBe(previewBackground);
  expect(menuBackground).not.toBe("rgba(0, 0, 0, 0)");
});

test("split button segments remain independently actionable", async () => {
  let previewClicks = 0;
  const { buttons } = renderSplitButton({
    onPreviewClick: () => {
      previewClicks += 1;
    },
  });

  await act(async () => {
    await page.elementLocator(buttons[0]).click();
  });
  expect(previewClicks).toBe(1);

  await act(async () => {
    await page.elementLocator(buttons[1]).click();
  });
  expect(previewClicks).toBe(1);
  await expect.element(page.getByText("Design")).toBeVisible();
});

test("hovering a disabled segment does not highlight its sibling", async () => {
  for (const disabled of ["preview", "menu"] as const) {
    const { buttons } = renderSplitButton({
      previewDisabled: disabled === "preview",
      menuDisabled: disabled === "menu",
    });
    const siblingIndex = disabled === "preview" ? 1 : 0;
    const disabledIndex = disabled === "preview" ? 0 : 1;
    const siblingBackground = getComputedStyle(
      buttons[siblingIndex]
    ).backgroundColor;

    await page.elementLocator(buttons[disabledIndex]).hover();

    expect(getComputedStyle(buttons[siblingIndex]).backgroundColor).toBe(
      siblingBackground
    );

    act(() => root?.unmount());
    root = undefined;
  }
});
