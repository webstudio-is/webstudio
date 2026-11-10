import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test } from "vitest";
import { Checkbox, CheckboxAndLabel } from "./checkbox";
import { Label } from "./label";

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
