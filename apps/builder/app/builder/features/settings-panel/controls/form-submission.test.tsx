import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { userEvent } from "@vitest/browser/context";
import { afterEach, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import type { Prop } from "@webstudio-is/sdk";
import {
  $dataSources,
  $instances,
  $props,
  $resources,
} from "~/shared/sync/data-stores";
import { FormSubmissionControl } from "./form-submission";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
const previousInstances = $instances.get();
const previousDataSources = $dataSources.get();
const previousProps = $props.get();
const previousResources = $resources.get();
const requestResource = (
  id: string,
  control?: "email" | "graphql" | "system"
) => ({
  id,
  name: id,
  control,
  method: "post" as const,
  url: '"https://example.com"',
  headers: [],
});
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  $instances.set(previousInstances);
  $dataSources.set(previousDataSources);
  $props.set(previousProps);
  $resources.set(previousResources);
  document.body.innerHTML = "";
});

test("a Form starts with an empty Resource list and can select an in-scope destination", async () => {
  $resources.set(new Map([["resource", requestResource("resource")]]));
  $instances.set(
    new Map([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [{ type: "id", value: "form" }],
        },
      ],
      [
        "form",
        { type: "instance", id: "form", component: "NativeForm", children: [] },
      ],
    ])
  );
  $dataSources.set(
    new Map([
      [
        "resourceDataSource",
        {
          type: "resource",
          id: "resourceDataSource",
          scopeInstanceId: "form",
          name: "Send request",
          resourceId: "resource",
        },
      ],
    ])
  );
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const onChange = vi.fn();
  const render = (prop?: Prop) => {
    root?.render(
      <TooltipProvider>
        <FormSubmissionControl
          instanceId="form"
          propName="action"
          prop={prop}
          computedValue={prop?.type === "json" ? prop.value : undefined}
          meta={{ type: "json", control: "form-submission", required: false }}
          onChange={onChange}
        />
      </TooltipProvider>
    );
  };
  await act(async () => render());
  const actionLabel = () =>
    Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => button.textContent === "Action"
    )!;
  await act(async () => userEvent.click(actionLabel()));
  expect(document.body.textContent).toContain(
    "Sends each form submission to all selected destinations at the same time."
  );
  const variableBullets = Array.from(
    document.body.querySelectorAll('[role="tooltip"] ul li')
  ).map((item) => item.textContent?.trim());
  expect(variableBullets).toEqual([
    "formData — submitted fields from this Form",
    "browserInfo — visitor details",
    "formState — current Form state: initial, success, or error.",
    "results — each action’s response, in order",
    "errors — failed actions and their messages",
  ]);
  expect(document.body.textContent).not.toContain("status —");
  expect(document.body.textContent).toContain("Add at least one action.");
  await act(async () => userEvent.keyboard("{Escape}"));
  expect(
    container.querySelector('[aria-label="Native browser form"]')
  ).toBeNull();
  expect(container.textContent).not.toContain(
    "Select at least one Resource destination"
  );
  expect(container.textContent).not.toContain(
    "Create a Resource in Data variables to add an action."
  );

  await act(async () =>
    render({
      id: "action",
      instanceId: "form",
      name: "action",
      type: "json",
      value: [],
    })
  );
  expect(container.textContent).not.toContain(
    "Select at least one Resource destination"
  );
  await act(async () =>
    userEvent.click(
      container.querySelector<HTMLButtonElement>('[aria-label="Add action"]')!
    )
  );
  const requestOption = Array.from(
    document.querySelectorAll<HTMLElement>('[role="menuitem"]')
  ).find((option) => option.textContent?.includes("Send request"));
  await act(async () => requestOption?.click());
  expect(onChange).toHaveBeenLastCalledWith({
    type: "json",
    value: [{ dataSourceId: "resourceDataSource", enabled: true }],
  });

  await act(async () =>
    render({
      id: "action",
      instanceId: "form",
      name: "action",
      type: "json",
      value: [{ dataSourceId: "resourceDataSource", enabled: true }],
    })
  );
  await act(async () =>
    $dataSources.set(
      new Map([
        [
          "resourceDataSource",
          {
            type: "resource",
            id: "resourceDataSource",
            scopeInstanceId: "form",
            name: "Renamed request",
            resourceId: "resource",
          },
        ],
      ])
    )
  );
  expect(container.textContent).toContain("Renamed request");
  await act(async () => userEvent.click(actionLabel()));
  expect(document.body.textContent).toContain(
    "Sends each form submission to all selected destinations at the same time."
  );
  expect(document.body.textContent).toContain("Reset");
  expect(document.body.textContent).not.toContain("Reset value");
  expect(document.body.textContent).not.toContain("Add at least one action.");
  await act(async () => userEvent.keyboard("{Escape}"));
  expect(onChange).toHaveBeenLastCalledWith({
    type: "json",
    value: [{ dataSourceId: "resourceDataSource", enabled: true }],
  });

  await act(async () =>
    render({
      id: "action",
      instanceId: "form",
      name: "action",
      type: "json",
      value: [
        { dataSourceId: "one", enabled: true },
        { dataSourceId: "two", enabled: true },
        { dataSourceId: "three", enabled: true },
        { dataSourceId: "four", enabled: true },
        { dataSourceId: "five", enabled: true },
      ],
    })
  );
  expect(container.textContent).not.toContain("Create Resource in Form");
  expect(
    container.querySelector<HTMLButtonElement>('[aria-label="Add action"]')
      ?.disabled
  ).toBe(true);
});

test("a Form can select a Resource defined outside its scope", async () => {
  $resources.set(new Map([["requestId", requestResource("requestId")]]));
  $instances.set(
    new Map([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [{ type: "id", value: "form" }],
        },
      ],
      [
        "form",
        { type: "instance", id: "form", component: "NativeForm", children: [] },
      ],
    ])
  );
  $dataSources.set(
    new Map([
      [
        "externalResourceId",
        {
          type: "resource",
          id: "externalResourceId",
          scopeInstanceId: "body",
          name: "Shared request",
          resourceId: "requestId",
        },
      ],
    ])
  );
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const onChange = vi.fn();
  await act(async () => {
    root?.render(
      <TooltipProvider>
        <FormSubmissionControl
          instanceId="form"
          propName="action"
          prop={{
            id: "action",
            instanceId: "form",
            name: "action",
            type: "json",
            value: [],
          }}
          computedValue={[]}
          meta={{ type: "json", control: "form-submission", required: false }}
          onChange={onChange}
        />
      </TooltipProvider>
    );
  });

  await act(async () =>
    userEvent.click(
      container.querySelector<HTMLButtonElement>('[aria-label="Add action"]')!
    )
  );
  const requestOption = Array.from(
    document.querySelectorAll<HTMLElement>('[role="menuitem"]')
  ).find((option) => option.textContent?.includes("Shared request"));
  expect(requestOption).toBeDefined();
  await act(async () => requestOption?.click());
  expect(onChange).toHaveBeenLastCalledWith({
    type: "json",
    value: [{ dataSourceId: "externalResourceId", enabled: true }],
  });
});

test("stored Form selection renders and a deleted Resource can be removed", async () => {
  $resources.set(new Map([["request-id", requestResource("request-id")]]));
  $instances.set(
    new Map([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [{ type: "id", value: "form" }],
        },
      ],
      [
        "form",
        { type: "instance", id: "form", component: "NativeForm", children: [] },
      ],
    ])
  );
  $dataSources.set(
    new Map([
      [
        "resource-id",
        {
          type: "resource",
          id: "resource-id",
          scopeInstanceId: "form",
          name: "Send request",
          resourceId: "request-id",
        },
      ],
    ])
  );
  const savedProp: Prop = {
    id: "action",
    instanceId: "form",
    name: "action",
    type: "json",
    value: [{ dataSourceId: "resource-id", enabled: true }],
  };
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const onChange = vi.fn();
  await act(async () => {
    root?.render(
      <TooltipProvider>
        <FormSubmissionControl
          instanceId="form"
          propName="action"
          prop={savedProp}
          computedValue={
            savedProp.type === "json" ? savedProp.value : undefined
          }
          meta={{ type: "json", control: "form-submission", required: false }}
          onChange={onChange}
        />
      </TooltipProvider>
    );
  });
  expect(container.textContent).toContain("Send request");
  expect(container.querySelectorAll('[data-list-item="true"]')).toHaveLength(1);

  await act(async () => $dataSources.set(new Map()));
  expect(container.textContent).toContain("Deleted Resource");
  const row = container.querySelector<HTMLButtonElement>(
    '[aria-label="Remove action Deleted Resource"]'
  )!;
  await act(async () => {
    row.click();
  });
  expect(onChange).toHaveBeenLastCalledWith({
    type: "json",
    value: [],
  });
});

test("Actions only offers eligible in-scope Resources and disables an added one", async () => {
  $instances.set(
    new Map([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [
            { type: "id", value: "form" },
            { type: "id", value: "sibling" },
          ],
        },
      ],
      [
        "form",
        { type: "instance", id: "form", component: "NativeForm", children: [] },
      ],
      [
        "sibling",
        { type: "instance", id: "sibling", component: "Box", children: [] },
      ],
    ])
  );
  const source = (id: string, scopeInstanceId: string, resourceId: string) => ({
    type: "resource" as const,
    id,
    scopeInstanceId,
    name: id,
    resourceId,
  });
  $dataSources.set(
    new Map([
      ["http", source("http", "form", "http-resource")],
      ["email", source("email", "body", "email-resource")],
      ["graphql", source("graphql", "form", "graphql-resource")],
      ["system", source("system", "form", "system-resource")],
      ["sibling", source("sibling", "sibling", "sibling-resource")],
    ])
  );
  $resources.set(
    new Map([
      ["http-resource", requestResource("http-resource")],
      ["email-resource", requestResource("email-resource", "email")],
      ["graphql-resource", requestResource("graphql-resource", "graphql")],
      ["system-resource", requestResource("system-resource", "system")],
      ["sibling-resource", requestResource("sibling-resource")],
    ])
  );
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const onChange = vi.fn();
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <FormSubmissionControl
          instanceId="form"
          propName="action"
          prop={{
            id: "action",
            instanceId: "form",
            name: "action",
            type: "json",
            value: [{ dataSourceId: "http", enabled: true }],
          }}
          computedValue={[{ dataSourceId: "http", enabled: true }]}
          meta={{ type: "json", control: "form-submission", required: false }}
          onChange={onChange}
        />
      </TooltipProvider>
    )
  );
  await act(
    async () =>
      await userEvent.click(
        container.querySelector<HTMLButtonElement>(
          '[aria-label="Action http"]'
        )!
      )
  );
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  const addButton = container.querySelector<HTMLButtonElement>(
    '[aria-label="Add action"]'
  )!;
  await act(async () => await userEvent.hover(addButton));
  await expect
    .poll(() => document.querySelector('[role="tooltip"]')?.textContent)
    .toContain("Add a resource to submit this Form.");
  await act(async () => await userEvent.click(addButton));
  const items = Array.from(
    document.querySelectorAll<HTMLElement>('[role="menuitem"]')
  );
  expect(items.map((item) => item.textContent)).toEqual([
    "email",
    "http",
    "graphql",
  ]);
  expect(
    items
      .find((item) => item.textContent === "http")
      ?.getAttribute("data-disabled")
  ).not.toBeNull();
  await act(
    async () =>
      await userEvent.click(items.find((item) => item.textContent === "email")!)
  );
  expect(onChange).toHaveBeenLastCalledWith({
    type: "json",
    value: [
      { dataSourceId: "http", enabled: true },
      { dataSourceId: "email", enabled: true },
    ],
  });
});

test("a disabled Action stays visible and can be enabled or removed", async () => {
  $instances.set(
    new Map([
      [
        "form",
        { type: "instance", id: "form", component: "NativeForm", children: [] },
      ],
    ])
  );
  $dataSources.set(
    new Map([
      [
        "send",
        {
          type: "resource",
          id: "send",
          scopeInstanceId: "form",
          name: "Send request",
          resourceId: "request",
        },
      ],
    ])
  );
  $resources.set(new Map([["request", requestResource("request")]]));
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const onChange = vi.fn();
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <FormSubmissionControl
          instanceId="form"
          propName="action"
          prop={{
            id: "action",
            instanceId: "form",
            name: "action",
            type: "json",
            value: [{ dataSourceId: "send", enabled: true }],
          }}
          computedValue={[{ dataSourceId: "send", enabled: true }]}
          meta={{ type: "json", control: "form-submission", required: false }}
          onChange={onChange}
        />
      </TooltipProvider>
    )
  );
  await act(async () =>
    container
      .querySelector<HTMLButtonElement>(
        '[aria-label="Disable action Send request"]'
      )
      ?.click()
  );
  expect(onChange).toHaveBeenLastCalledWith({
    type: "json",
    value: [{ dataSourceId: "send", enabled: false }],
  });
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <FormSubmissionControl
          instanceId="form"
          propName="action"
          prop={{
            id: "action",
            instanceId: "form",
            name: "action",
            type: "json",
            value: [{ dataSourceId: "send", enabled: false }],
          }}
          computedValue={[{ dataSourceId: "send", enabled: false }]}
          meta={{ type: "json", control: "form-submission", required: false }}
          onChange={onChange}
        />
      </TooltipProvider>
    )
  );
  const row = container.querySelector<HTMLElement>('[data-list-item="true"]');
  expect(row?.getAttribute("aria-label")).toBe("Action Send request");
  expect(row?.textContent).toContain("Send request");
  expect(row?.querySelector("label")).toBeNull();
  expect(row?.getClientRects().length).toBeGreaterThan(0);
  expect(getComputedStyle(row!).opacity).toBe("0.2");
  expect(row?.hasAttribute("disabled")).toBe(true);
  expect(row?.parentElement?.getBoundingClientRect().left).toBeLessThan(
    container.getBoundingClientRect().left
  );
  await act(async () =>
    container
      .querySelector<HTMLButtonElement>(
        '[aria-label="Enable action Send request"]'
      )
      ?.click()
  );
  expect(onChange).toHaveBeenLastCalledWith({
    type: "json",
    value: [{ dataSourceId: "send", enabled: true }],
  });
  await act(async () =>
    container
      .querySelector<HTMLButtonElement>(
        '[aria-label="Remove action Send request"]'
      )
      ?.click()
  );
  expect(onChange).toHaveBeenLastCalledWith({
    type: "json",
    value: [],
  });
  const actionsLabel = Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent === "Action"
  );
  expect(actionsLabel).toBeDefined();
  await act(async () =>
    actionsLabel?.dispatchEvent(
      new MouseEvent("click", { altKey: true, bubbles: true })
    )
  );
  expect(onChange).toHaveBeenLastCalledWith({
    type: "json",
    value: [],
  });
});

test.each([
  { actions: [], showWarning: true },
  {
    actions: [{ dataSourceId: "first", enabled: false }],
    showWarning: false,
  },
  {
    actions: [
      { dataSourceId: "first", enabled: false },
      { dataSourceId: "second", enabled: true },
    ],
    showWarning: false,
  },
])(
  "the approved empty-action warning appears only when the list is empty",
  async ({ actions, showWarning }) => {
    $instances.set(
      new Map([
        [
          "form",
          {
            id: "form",
            type: "instance",
            component: "NativeForm",
            children: [],
          },
        ],
      ])
    );
    $dataSources.set(
      new Map(
        ["first", "second"].map((id) => [
          id,
          {
            id,
            type: "resource" as const,
            name: id,
            scopeInstanceId: "form",
            resourceId: "request",
          },
        ])
      )
    );
    $resources.set(
      new Map([
        [
          "request",
          {
            id: "request",
            name: "Request",
            method: "get",
            url: '"https://example.com"',
            headers: [],
          },
        ],
      ])
    );
    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(
        <TooltipProvider>
          <FormSubmissionControl
            instanceId="form"
            propName="action"
            prop={{
              id: "action",
              instanceId: "form",
              name: "action",
              type: "json",
              value: actions,
            }}
            computedValue={actions}
            meta={{ type: "json", control: "form-submission", required: false }}
            onChange={vi.fn()}
          />
        </TooltipProvider>
      )
    );
    const label = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Action"
    )!;
    await act(async () => await userEvent.click(label));
    expect(
      document.body.textContent?.includes("Add at least one action.")
    ).toBe(showWarning);
  }
);
