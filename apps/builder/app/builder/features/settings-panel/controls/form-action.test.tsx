import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { userEvent } from "@vitest/browser/context";
import { afterEach, expect, test, vi } from "vitest";
import {
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
  TooltipProvider,
} from "@webstudio-is/design-system";
import { PlusIcon } from "@webstudio-is/icons";
import type { Prop } from "@webstudio-is/sdk";
import {
  $dataSources,
  $instances,
  $props,
  $resources,
} from "~/shared/sync/data-stores";
import { FormActionControl } from "./form-action";

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

test("Action + explains how to add a resource when none are available", async () => {
  $instances.set(
    new Map([
      [
        "form",
        {
          type: "instance",
          id: "form",
          component: "Form",
          children: [],
        },
      ],
    ])
  );
  $dataSources.set(new Map());
  $resources.set(new Map());
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const onChange = vi.fn();
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <FormActionControl
          instanceId="form"
          propName="action"
          prop={undefined}
          computedValue={undefined}
          meta={{ type: "json", control: "form-action", required: false }}
          onChange={onChange}
        />
      </TooltipProvider>
    )
  );

  const addButton = container.querySelector<HTMLButtonElement>(
    '[aria-label="Add action"]'
  )!;
  expect(addButton.disabled).toBe(false);
  expect(addButton.dataset.buttonColor).toBe("ghost");
  await act(async () => userEvent.click(addButton));
  expect(document.querySelector('[role="tooltip"]')?.textContent).toContain(
    "Create a resource in the Variables section first."
  );
  expect(document.querySelector('[role="menu"]')).toBeNull();
  expect(onChange).not.toHaveBeenCalled();
});

test("Action + matches the Variables + button in every interaction state", async () => {
  $instances.set(
    new Map([
      [
        "form",
        { type: "instance", id: "form", component: "Form", children: [] },
      ],
    ])
  );
  $dataSources.set(new Map());
  $resources.set(new Map());
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <SectionTitle
          suffix={
            <SectionTitleButton
              aria-label="Add variable"
              prefix={<PlusIcon />}
            />
          }
        >
          <SectionTitleLabel>Variables</SectionTitleLabel>
        </SectionTitle>
        <FormActionControl
          instanceId="form"
          propName="action"
          prop={undefined}
          computedValue={undefined}
          meta={{ type: "json", control: "form-action", required: false }}
          onChange={vi.fn()}
        />
      </TooltipProvider>
    )
  );

  const variableButton = Array.from(
    container.querySelectorAll<HTMLButtonElement>('[aria-label="Add variable"]')
  ).at(-1)!;
  const actionButton = container.querySelector<HTMLButtonElement>(
    '[aria-label="Add action"]'
  )!;
  expect(actionButton.tabIndex).toBe(0);
  for (const state of ["auto", "hover", "focus", "pressed"]) {
    variableButton.dataset.state = state;
    actionButton.dataset.state = state;
    const reference = getComputedStyle(variableButton);
    const actual = getComputedStyle(actionButton);
    for (const property of [
      "backgroundColor",
      "color",
      "outlineColor",
      "outlineStyle",
      "outlineWidth",
      "outlineOffset",
      "borderRadius",
      "height",
      "paddingInlineStart",
      "paddingInlineEnd",
    ] as const) {
      expect(actual[property], `${state}: ${property}`).toBe(
        reference[property]
      );
    }
  }
});

test("Action control handles an empty Resource list and can select an in-scope destination", async () => {
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
        {
          type: "instance",
          id: "form",
          component: "Form",
          children: [],
        },
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
          name: "Go",
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
        <FormActionControl
          instanceId="form"
          propName="action"
          prop={prop}
          computedValue={prop?.type === "json" ? prop.value : undefined}
          meta={{ type: "json", control: "form-action", required: false }}
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
    "Sends each form submission to all destinations at the same time."
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
  expect(container.textContent).toContain("Navigation mode");
  await act(async () => userEvent.keyboard("{Escape}"));
  expect(
    container.querySelector('[aria-label="About navigation mode"]')
  ).not.toBeNull();
  await act(async () =>
    container
      .querySelector<SVGElement>('[aria-label="About navigation mode"]')
      ?.focus()
  );
  expect(document.body.textContent).toContain(
    "Submits the form fields as URL query parameters and navigates without a full page reload. Use this for search and filters that update page Resources from the URL."
  );
  await act(async () => userEvent.keyboard("{Escape}"));
  expect(container.textContent).not.toContain(
    "Select at least one Resource destination"
  );
  expect(container.textContent).not.toContain(
    "Create a Resource in Data variables to add an action."
  );

  const addButton = container.querySelector<HTMLButtonElement>(
    '[aria-label="Add action"]'
  )!;
  expect(addButton.dataset.buttonColor).toBe("ghost");

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
  await act(async () => userEvent.click(addButton));
  expect(
    getComputedStyle(document.querySelector('[role="menu"]')!).minWidth
  ).toBe("180px");
  const requestOption = Array.from(
    document.querySelectorAll<HTMLElement>('[role="menuitem"]')
  ).find((option) => option.textContent?.includes("Go"));
  await act(async () => requestOption?.click());
  expect(onChange).toHaveBeenLastCalledWith({
    type: "json",
    value: [{ dataSourceId: "resourceDataSource" }],
  });

  await act(async () =>
    render({
      id: "action",
      instanceId: "form",
      name: "action",
      type: "json",
      value: [{ dataSourceId: "resourceDataSource" }],
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
    "Sends each form submission to all destinations at the same time."
  );
  expect(document.body.textContent).toContain("Reset");
  expect(document.body.textContent).not.toContain("Reset value");
  expect(container.textContent).not.toContain("Navigation mode");
  await act(async () => userEvent.keyboard("{Escape}"));
  expect(onChange).toHaveBeenLastCalledWith({
    type: "json",
    value: [{ dataSourceId: "resourceDataSource" }],
  });

  await act(async () =>
    render({
      id: "action",
      instanceId: "form",
      name: "action",
      type: "json",
      value: Array.from({ length: 10 }, (_, index) => ({
        dataSourceId: `resource-${index}`,
      })),
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
        {
          type: "instance",
          id: "form",
          component: "Form",
          children: [],
        },
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
        <FormActionControl
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
          meta={{ type: "json", control: "form-action", required: false }}
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
    value: [{ dataSourceId: "externalResourceId" }],
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
        {
          type: "instance",
          id: "form",
          component: "Form",
          children: [],
        },
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
    value: [{ dataSourceId: "resource-id" }],
  };
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const onChange = vi.fn();
  await act(async () => {
    root?.render(
      <TooltipProvider>
        <FormActionControl
          instanceId="form"
          propName="action"
          prop={savedProp}
          computedValue={
            savedProp.type === "json" ? savedProp.value : undefined
          }
          meta={{ type: "json", control: "form-action", required: false }}
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
        {
          type: "instance",
          id: "form",
          component: "Form",
          children: [],
        },
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
        <FormActionControl
          instanceId="form"
          propName="action"
          prop={{
            id: "action",
            instanceId: "form",
            name: "action",
            type: "json",
            value: [{ dataSourceId: "http" }],
          }}
          computedValue={[{ dataSourceId: "http" }]}
          meta={{ type: "json", control: "form-action", required: false }}
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
    value: [{ dataSourceId: "http" }, { dataSourceId: "email" }],
  });
});

test("a legacy Action stays visible and can be removed", async () => {
  $instances.set(
    new Map([
      [
        "form",
        {
          type: "instance",
          id: "form",
          component: "Form",
          children: [],
        },
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
        <FormActionControl
          instanceId="form"
          propName="action"
          prop={{
            id: "action",
            instanceId: "form",
            name: "action",
            type: "json",
            value: [{ dataSourceId: "send", enabled: false }],
          }}
          computedValue={[{ dataSourceId: "send" }]}
          meta={{ type: "json", control: "form-action", required: false }}
          onChange={onChange}
        />
      </TooltipProvider>
    )
  );
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <FormActionControl
          instanceId="form"
          propName="action"
          prop={{
            id: "action",
            instanceId: "form",
            name: "action",
            type: "json",
            value: [{ dataSourceId: "send" }],
          }}
          computedValue={[{ dataSourceId: "send" }]}
          meta={{ type: "json", control: "form-action", required: false }}
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
  expect(getComputedStyle(row!).opacity).toBe("1");
  expect(row?.hasAttribute("disabled")).toBe(false);
  expect(row?.getBoundingClientRect().left).toBe(
    container.getBoundingClientRect().left
  );
  const addButton = container.querySelector<HTMLButtonElement>(
    '[aria-label="Add action"]'
  )!;
  await act(async () => addButton.focus());
  await act(async () => userEvent.tab());
  expect(document.activeElement).toBe(row);
  await act(async () => userEvent.keyboard("{ArrowRight}"));
  expect(document.activeElement?.getAttribute("aria-label")).toBe(
    "Remove action Send request"
  );
  await act(async () => userEvent.keyboard("{Enter}"));
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
  { actions: [], mode: "Navigation mode", warning: undefined },
  {
    actions: [{ dataSourceId: "first" }],
    mode: undefined,
    warning: undefined,
  },
  {
    actions: [{ dataSourceId: "first" }, { dataSourceId: "second" }],
    mode: undefined,
    warning: undefined,
  },
])(
  "an empty Action list selects Navigation mode; a non-empty legacy list does not",
  async ({ actions, mode, warning }) => {
    $instances.set(
      new Map([
        [
          "form",
          {
            id: "form",
            type: "instance",
            component: "Form",
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
          <FormActionControl
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
            meta={{
              type: "json",
              control: "form-action",
              required: false,
            }}
            onChange={vi.fn()}
          />
        </TooltipProvider>
      )
    );
    expect(container.textContent?.includes("Navigation mode")).toBe(
      mode === "Navigation mode"
    );
    if (mode) {
      expect(
        container.querySelector('[aria-label="About navigation mode"]')
      ).not.toBeNull();
    }
    if (warning) {
      expect(container.textContent).toContain(warning);
    }
  }
);
