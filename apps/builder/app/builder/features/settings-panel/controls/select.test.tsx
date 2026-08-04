// @vitest-environment jsdom

import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { SelectControl } from "./select";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

const renderSelect = (bound: boolean) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <TooltipProvider>
        <SelectControl
          instanceId="code"
          meta={{
            type: "string",
            control: "select",
            required: true,
            options: ["javascript"],
            bindable: false,
          }}
          prop={
            bound
              ? {
                  id: "language",
                  instanceId: "code",
                  name: "language",
                  type: "expression",
                  value: '"javascript"',
                }
              : undefined
          }
          propName="language"
          computedValue="javascript"
          onChange={() => {}}
        />
      </TooltipProvider>
    );
  });
  return container;
};

test("keeps the removal affordance for an existing binding", () => {
  const container = renderSelect(true);

  expect(
    container.querySelector('button[data-variant="bound"]')
  ).not.toBeNull();
});

test("does not offer a new binding when the select is non-bindable", () => {
  const container = renderSelect(false);

  expect(container.querySelector('button[data-variant="default"]')).toBeNull();
});
