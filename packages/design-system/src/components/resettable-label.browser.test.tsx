import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import { userEvent } from "@vitest/browser/context";
import "../colors/colors.css";
import { ResettableLabel } from "./resettable-label";
import { TooltipProvider } from "./tooltip";
import { Label } from "./label";

let root: Root | undefined;
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

test("a label without information or a reset action focuses its input without a tooltip", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <TooltipProvider delayDuration={0}>
        <ResettableLabel htmlFor="empty">Summary</ResettableLabel>
        <input id="empty" />
      </TooltipProvider>
    )
  );
  const label = container.querySelector<HTMLElement>('label[for="empty"]')!;
  await act(async () => userEvent.click(label));
  expect(document.querySelector('[role="tooltip"]')).toBeNull();
  expect(document.activeElement).toBe(container.querySelector("input"));
  expect(label.getAttribute("role")).not.toBe("button");
});

test.each(["block", "grid", "flex"])(
  "sizes the label to its text in a %s layout without overflowing",
  async (display) => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(
        <TooltipProvider>
          <div
            data-layout
            style={{ display, flexDirection: "column", width: 300 }}
          >
            <ResettableLabel data-label>Summary</ResettableLabel>
            <ResettableLabel data-label>
              A very long field label that must not overflow the available space
              in its container
            </ResettableLabel>
          </div>
        </TooltipProvider>
      )
    );
    const layout = container.querySelector<HTMLElement>("[data-layout]")!;
    const [short, long] = layout.querySelectorAll<HTMLElement>("[data-label]");
    const textRange = document.createRange();
    textRange.selectNodeContents(short);
    expect(short.getBoundingClientRect().width).toBeGreaterThanOrEqual(
      textRange.getBoundingClientRect().width
    );
    expect(short.getBoundingClientRect().width).toBeLessThan(150);
    expect(short.parentElement!.getBoundingClientRect().width).toBeLessThan(
      150
    );
    expect(long.getBoundingClientRect().width).toBeLessThanOrEqual(300);
    expect(layout.scrollWidth).toBe(layout.clientWidth);
  }
);

test.each(["mouse", "alt", "keyboard"])(
  "resets via %s without submitting or bubbling Alt-click",
  async (method) => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const onReset = vi.fn();
    const onSubmit = vi.fn();
    const onClick = vi.fn();
    await act(async () =>
      root?.render(
        <TooltipProvider>
          <form onSubmit={onSubmit} onClick={onClick}>
            <ResettableLabel htmlFor="value" onReset={onReset} color="local">
              Summary
            </ResettableLabel>
            <input id="value" />
          </form>
        </TooltipProvider>
      )
    );
    const label = container.querySelector<HTMLElement>('[role="button"]')!;
    expect(
      document.querySelector<HTMLInputElement>("#value")?.labels?.[0]
    ).toBe(label);
    if (method === "alt") {
      act(() =>
        label.dispatchEvent(
          new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            altKey: true,
          })
        )
      );
      expect(onClick).not.toHaveBeenCalled();
    } else {
      if (method === "keyboard") {
        act(() => label.focus());
        await act(async () => userEvent.keyboard("{Enter}"));
        await act(async () => userEvent.tab());
        expect(document.activeElement?.tagName).toBe("BUTTON");
        await act(async () => userEvent.keyboard("{Enter}"));
      } else {
        await act(async () => userEvent.click(label));
        const reset = document.querySelector<HTMLButtonElement>(
          'button[type="button"]'
        )!;
        expect(reset).not.toBeNull();
        await act(async () => userEvent.click(reset));
      }
    }
    expect(onReset).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(label);
  }
);

test.each([true, false])(
  "preserves caller colors independently of reset availability (disabled: %s)",
  async (disabled) => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const onReset = vi.fn();
    await act(async () =>
      root?.render(
        <TooltipProvider>
          <ResettableLabel
            asChild
            color="overwritten"
            resetDisabled={disabled}
            onReset={onReset}
            content={<div data-custom-content>Source information</div>}
          >
            <Label>Color</Label>
          </ResettableLabel>
          <Label color="overwritten" data-reference>
            Reference
          </Label>
        </TooltipProvider>
      )
    );
    const label = container.querySelector<HTMLElement>('[role="button"]')!;
    expect(getComputedStyle(label).backgroundColor).toBe(
      getComputedStyle(container.querySelector("[data-reference]")!)
        .backgroundColor
    );
    act(() =>
      label.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          altKey: true,
        })
      )
    );
    expect(onReset).toHaveBeenCalledTimes(disabled ? 0 : 1);
    await act(async () => userEvent.click(label));
    expect(document.querySelector("[data-custom-content]")).not.toBeNull();
    const reset = document.querySelector<HTMLButtonElement>(
      'button[type="button"]'
    )!;
    expect(reset.disabled).toBe(disabled);
  }
);

test("click opens immediately and keeps the tooltip open while the label stays hovered", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <TooltipProvider delayDuration={500}>
        <ResettableLabel description="Shown to editors">
          Summary
        </ResettableLabel>
      </TooltipProvider>
    )
  );
  const label = container.querySelector<HTMLElement>('[role="button"]')!;
  await act(async () => userEvent.hover(label));
  await act(async () => userEvent.click(label));
  expect(document.querySelector('[role="tooltip"]')).not.toBeNull();

  await act(async () => new Promise((resolve) => setTimeout(resolve, 600)));
  expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
});

test("shows a description without repeating the property label", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <TooltipProvider delayDuration={0}>
        <ResettableLabel description="Shown to editors">
          Summary
        </ResettableLabel>
      </TooltipProvider>
    )
  );
  const label = container.querySelector<HTMLElement>('[role="button"]')!;
  await act(async () => userEvent.hover(label));
  const tooltip = document.querySelector('[role="tooltip"]')!;
  expect(tooltip.textContent).toBe("Shown to editors");
});
