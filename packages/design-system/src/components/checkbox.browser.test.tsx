import { page, userEvent } from "@vitest/browser/context";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test } from "vitest";
import { Checkbox, CheckboxAndLabel } from "./checkbox";
import { Label } from "./label";
import "../colors/colors.css";

let root: Root | undefined;

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

test("consent checkboxes keep their size beside wrapped labels", () => {
  const container = document.createElement("div");
  container.style.width = "220px";
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root?.render(
      <>
        {[false, true].map((checked) => (
          <CheckboxAndLabel
            key={String(checked)}
            css={{ alignItems: "flex-start" }}
          >
            <Checkbox checked={checked} aria-label={String(checked)} />
            <Label css={{ flexShrink: 1 }}>
              I understand that by submitting, this project will become
              available in a public marketplace.
            </Label>
          </CheckboxAndLabel>
        ))}
      </>
    );
  });

  const checkboxes = [
    ...container.querySelectorAll<HTMLButtonElement>("button"),
  ];
  expect(checkboxes).toHaveLength(2);
  for (const checkbox of checkboxes) {
    const { width, height, top } = checkbox.getBoundingClientRect();
    const rowTop = checkbox.parentElement?.getBoundingClientRect().top;
    expect({ width, height }).toEqual({ width: 14, height: 14 });
    expect(top).toBe(rowTop);
  }
});

test("checkbox keeps its visible size on hover, focus border, and checked marks", async () => {
  const container = document.createElement("div");
  container.style.padding = "20px";
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root?.render(<Checkbox aria-label="Selection" />);
  });

  const checkbox = container.querySelector<HTMLButtonElement>("button")!;
  const restRect = checkbox.getBoundingClientRect();
  const { borderWidth: restBorderWidth, borderColor: restBorderColor } =
    getComputedStyle(checkbox);
  expect({ width: restRect.width, height: restRect.height }).toEqual({
    width: 14,
    height: 14,
  });
  expect(restBorderWidth).toBe("1px");
  expect(restBorderColor).toBe("rgba(0, 0, 0, 0)");

  await page.elementLocator(checkbox).hover();
  const hoverRect = checkbox.getBoundingClientRect();
  const hoverBorder = getComputedStyle(checkbox);
  expect({ width: hoverRect.width, height: hoverRect.height }).toEqual({
    width: restRect.width,
    height: restRect.height,
  });
  expect(hoverBorder.borderWidth).toBe(restBorderWidth);
  expect(hoverBorder.borderColor).toBe(restBorderColor);

  await act(async () => userEvent.tab());
  expect(document.activeElement).toBe(checkbox);
  expect(checkbox.matches(":focus-visible")).toBe(true);
  expect(getComputedStyle(checkbox).borderColor).not.toBe(restBorderColor);

  container.style.colorScheme = "dark";
  const darkFill = document.createElement("div");
  darkFill.style.backgroundColor = "var(--foreground-disabled)";
  container.append(darkFill);
  expect(getComputedStyle(checkbox).backgroundColor).toBe(
    getComputedStyle(darkFill).backgroundColor
  );

  act(() => root?.unmount());
  root = createRoot(container);
  act(() => {
    root?.render(
      <>
        <Checkbox checked aria-label="Checked" />
        <Checkbox checked disabled aria-label="Disabled checked" />
      </>
    );
  });

  const checkboxes = container.querySelectorAll<HTMLButtonElement>("button");
  expect(checkboxes).toHaveLength(2);
  for (const checkbox of checkboxes) {
    expect(checkbox.dataset.state).toBe("checked");
    expect(checkbox.querySelector("svg")).not.toBeNull();
  }
  expect(checkboxes[1].disabled).toBe(true);
  expect(getComputedStyle(checkboxes[1]).color).not.toBe(
    getComputedStyle(checkboxes[0]).color
  );
});
