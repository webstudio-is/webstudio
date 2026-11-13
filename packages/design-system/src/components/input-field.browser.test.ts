import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test } from "vitest";
import { InputField } from "./input-field";
import { NestedIconLabel } from "./nested-icon-label";
import { NestedInputButton } from "./nested-input-button";

let root: Root | undefined;

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

test("compact input field fits nested controls inside its content box", () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root?.render(
      createElement(InputField, {
        size: "1",
        prefix: createElement(
          NestedIconLabel,
          { size: "1" },
          createElement("svg")
        ),
        suffix: createElement(NestedInputButton, { size: "1" }),
      })
    );
  });

  const inputField = container.querySelector(
    "[data-input-field-input]"
  )?.parentElement;
  const nestedControls = container.querySelectorAll("label, button");
  if (
    inputField === null ||
    inputField === undefined ||
    nestedControls.length !== 2
  ) {
    throw new Error("Expected a compact input field with two nested controls");
  }

  const availableHeight = inputField.getBoundingClientRect().height - 2;
  for (const nestedControl of nestedControls) {
    expect(nestedControl.getBoundingClientRect().height).toBeLessThanOrEqual(
      availableHeight
    );
  }
});
