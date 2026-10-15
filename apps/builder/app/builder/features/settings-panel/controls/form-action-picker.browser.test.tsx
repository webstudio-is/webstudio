import { useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { userEvent } from "@vitest/browser/context";
import { afterEach, expect, test } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import type { FormSubmission, Prop } from "@webstudio-is/sdk";
import {
  $dataSources,
  $instances,
  $resources,
} from "~/shared/sync/data-stores";
import { FormActionControl } from "./form-action";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
const originalInstances = $instances.get();
const originalDataSources = $dataSources.get();
const originalResources = $resources.get();

const names = ["HTTP", "GraphQL", "Email"] as const;
const setup = (resourceNames: readonly string[]) => {
  $instances.set(
    new Map([
      [
        "form",
        {
          type: "instance" as const,
          id: "form",
          component: "Form",
          children: [],
        },
      ],
    ])
  );
  $dataSources.set(
    new Map(
      resourceNames.map((name) => [
        name,
        {
          type: "resource" as const,
          id: name,
          name,
          scopeInstanceId: "form",
          resourceId: `resource-${name}`,
        },
      ])
    )
  );
  $resources.set(
    new Map(
      resourceNames.map((name) => [
        `resource-${name}`,
        {
          id: `resource-${name}`,
          name,
          control:
            name === "GraphQL"
              ? ("graphql" as const)
              : name === "Email"
                ? ("email" as const)
                : undefined,
          method: "post" as const,
          url: '"https://example.test/submit"',
          headers: [],
        },
      ])
    )
  );
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  let saved: FormSubmission = [];
  const Harness = () => {
    const [action, setAction] = useState<FormSubmission>([]);
    const prop: Prop = {
      id: "action",
      instanceId: "form",
      name: "action",
      type: "json",
      value: action,
    };
    return (
      <TooltipProvider>
        <div data-floating-panel-container>
          <FormActionControl
            instanceId="form"
            propName="action"
            prop={prop}
            computedValue={action}
            meta={{ type: "json", control: "form-action", required: false }}
            onChange={(change) => {
              if (change.type === "json") {
                saved = change.value as FormSubmission;
                setAction(saved);
              }
            }}
          />
        </div>
      </TooltipProvider>
    );
  };
  act(() => root?.render(<Harness />));
  const addButton = () =>
    container
      .querySelectorAll<HTMLButtonElement>('[aria-label="Add action"]')
      .item(1)!;
  const add = async (name: string) => {
    await act(async () => userEvent.click(addButton()));
    const option = Array.from(
      document.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).find((item) => item.textContent === name);
    expect(option, `picker option ${name}`).toBeDefined();
    await act(async () => userEvent.click(option!));
  };
  return {
    container,
    addButton,
    add,
    get saved() {
      return saved;
    },
  };
};

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  $instances.set(originalInstances);
  $dataSources.set(originalDataSources);
  $resources.set(originalResources);
  document.body.innerHTML = "";
});

test("Action picker adds, reorders, and removes HTTP, GraphQL, and Email resources", async () => {
  const ui = setup(names);
  for (const name of names) {
    await ui.add(name);
  }
  expect(ui.saved).toEqual(names.map((dataSourceId) => ({ dataSourceId })));
  expect(
    Array.from(ui.container.querySelectorAll('[data-list-item="true"]')).map(
      (row) => row.getAttribute("aria-label")
    )
  ).toEqual(names.map((name) => `Action ${name}`));

  const source = ui.container.querySelector<HTMLElement>(
    '[aria-label="Action Email"] [data-drag-handle]'
  )!;
  const target = ui.container.querySelector<HTMLElement>(
    '[aria-label="Action HTTP"]'
  )!;
  const start = source.getBoundingClientRect();
  const end = target.getBoundingClientRect();
  const pointerId = 1;
  await act(async () => {
    source.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        button: 0,
        pointerId,
        clientX: start.x + 8,
        clientY: start.y + 8,
      })
    );
    window.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        pointerId,
        clientX: end.x + 8,
        clientY: end.y + 4,
      })
    );
  });
  await act(async () => {
    window.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        pointerId,
        clientX: end.x + 8,
        clientY: end.y + 4,
      })
    );
    window.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        pointerId,
        clientX: end.x + 8,
        clientY: end.y + 4,
      })
    );
  });
  expect(ui.saved).toEqual([
    { dataSourceId: "Email" },
    { dataSourceId: "HTTP" },
    { dataSourceId: "GraphQL" },
  ]);
  // useDrag suppresses the click immediately following a drag for 300 ms.
  await new Promise((resolve) => setTimeout(resolve, 350));
  await act(async () =>
    ui.container
      .querySelector<HTMLButtonElement>('[aria-label="Remove action HTTP"]')!
      .click()
  );
  expect(ui.saved).toEqual([
    { dataSourceId: "Email" },
    { dataSourceId: "GraphQL" },
  ]);
});

test("Action picker accepts ten resources and blocks an eleventh", async () => {
  const names = Array.from({ length: 11 }, (_, index) => `HTTP ${index + 1}`);
  const ui = setup(names);
  for (const name of names.slice(0, 10)) {
    await ui.add(name);
  }
  expect(ui.saved).toHaveLength(10);
  expect(ui.addButton().disabled).toBe(true);
  await act(async () => ui.addButton().click());
  expect(document.querySelector('[role="menuitem"]')).toBeNull();
  expect(ui.saved.map(({ dataSourceId }) => dataSourceId)).toEqual(
    names.slice(0, 10)
  );
});
