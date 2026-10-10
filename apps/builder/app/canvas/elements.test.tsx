import { forwardRef } from "react";
import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";
import { ROOT_INSTANCE_ID, type Instance } from "@webstudio-is/sdk";
import type { Components } from "@webstudio-is/react-sdk";
import { $variableValuesByInstanceSelector } from "~/shared/nano-states";
import { getInstanceKey } from "~/shared/nano-states/instances";
import {
  createInstanceChildrenElements,
  createManagedFormErrorElements,
  type WebstudioComponentProps,
} from "./elements";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test("renders expression and instance siblings in order", async () => {
  $variableValuesByInstanceSelector.set(
    new Map([
      [
        getInstanceKey(["parent", ROOT_INSTANCE_ID]),
        new Map([["name", "world"]]),
      ],
    ])
  );
  const instances = new Map<string, Instance>([
    [
      "child",
      {
        id: "child",
        type: "instance",
        component: "Box",
        children: [],
      },
    ],
  ]);
  const Component = forwardRef<HTMLElement, WebstudioComponentProps>(
    ({ instance }, _ref) => <span>{instance.id}</span>
  );
  const children = createInstanceChildrenElements({
    instances,
    instanceSelector: ["parent"],
    children: [
      {
        type: "expression",
        value: '"Hello " + $ws$dataSource$name',
      },
      { type: "id", value: "child" },
    ],
    Component,
    components: new Map() as Components,
  });

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<>{children}</>);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
  expect(container.innerHTML).toBe("Hello world<span>child</span>");
  root.unmount();
  container.remove();
  $variableValuesByInstanceSelector.set(new Map());
});

test("updates expressions when async scoped values resolve", async () => {
  $variableValuesByInstanceSelector.set(new Map());
  const children = createInstanceChildrenElements({
    instances: new Map(),
    instanceSelector: ["parent"],
    children: [
      {
        type: "expression",
        value: "$ws$dataSource$resource.data.title",
      },
    ],
    Component: forwardRef<HTMLElement, WebstudioComponentProps>(() => <span />),
    components: new Map() as Components,
  });

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<>{children}</>);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
  expect(container.innerHTML).toBe("");

  await act(async () => {
    $variableValuesByInstanceSelector.set(
      new Map([
        [
          getInstanceKey(["parent", ROOT_INSTANCE_ID]),
          new Map([["resource", { data: { title: "Loaded" } }]]),
        ],
      ])
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });

  expect(container.innerHTML).toBe("Loaded");
  root.unmount();
  container.remove();
  $variableValuesByInstanceSelector.set(new Map());
});

test("saved Form error rendering follows one and multiple live runtime errors with escaped text", async () => {
  const selector = ["saved-error", "saved-form"];
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    $variableValuesByInstanceSelector.set(
      new Map([
        [
          getInstanceKey([...selector, ROOT_INSTANCE_ID]),
          new Map([["saved-errors", [{ message: "Add at least one action" }]]]),
        ],
      ])
    );
    await act(async () =>
      root.render(
        <div className="authored-style">
          {createManagedFormErrorElements(
            "$ws$dataSource$saved__DASH__errors",
            selector
          )}
        </div>
      )
    );
    await expect
      .poll(() => container.textContent)
      .toBe("Add at least one action");
    await act(async () =>
      $variableValuesByInstanceSelector.set(
        new Map([
          [
            getInstanceKey([...selector, ROOT_INSTANCE_ID]),
            new Map([
              [
                "saved-errors",
                [
                  { message: "First failure" },
                  { message: "<script>escaped failure</script>" },
                ],
              ],
            ]),
          ],
        ])
      )
    );
    await expect.poll(() => container.textContent).toContain("First failure");
    expect(container.textContent).toContain("<script>escaped failure</script>");
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector(".authored-style")).not.toBeNull();
  } finally {
    act(() => root.unmount());
    container.remove();
    $variableValuesByInstanceSelector.set(new Map());
  }
});
