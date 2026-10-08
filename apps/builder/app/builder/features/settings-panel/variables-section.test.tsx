import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { userEvent } from "@vitest/browser/context";
import { afterEach, expect, test, vi } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import { CollapsibleProvider } from "~/builder/shared/collapsible-section";
import {
  $selectedInstanceSelector,
  $selectedPageId,
  selectInstance,
} from "~/shared/nano-states";
import { encodeDataSourceVariable, ROOT_INSTANCE_ID } from "@webstudio-is/sdk";
import { $pages, $props, $resources } from "~/shared/sync/data-stores";
import { registerContainers } from "~/shared/sync/sync-stores";
import { FormSubmissionControl } from "./controls/form-submission";
import { $variableToFocus, $variableToOpen } from "./variable-navigation";
import { TooltipProvider } from "@webstudio-is/design-system";
import { $instances, $dataSources } from "~/shared/sync/data-stores";
import { __testing__, VariablesSection } from "./variables-section";
import { __testing__ as popoverTesting } from "./variable-popover";
import {
  $livePreviewBrowserInfo,
  recordPreviewBrowserInfo,
} from "~/shared/preview-form-values";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
registerContainers();
afterEach(() => {
  act(() => root?.unmount());
  vi.restoreAllMocks();
  root = undefined;
  document.body.innerHTML = "";
  $variableToFocus.set(undefined);
  $variableToOpen.set(undefined);
  selectInstance(undefined);
  $pages.set(undefined);
  $props.set(new Map());
  $resources.set(new Map());
  $instances.set(new Map());
  $dataSources.set(new Map());
  $livePreviewBrowserInfo.set(new Map());
});
const setup = () => {
  const parent = {
    id: "parent",
    type: "instance" as const,
    component: "Body",
    children: [{ type: "id" as const, value: "child" }],
  };
  const child = {
    id: "child",
    type: "instance" as const,
    component: "Box",
    children: [],
  };
  const ancestor = {
    id: "ancestor",
    type: "variable" as const,
    scopeInstanceId: "parent",
    name: "Color",
    value: { type: "string" as const, value: "blue" },
  };
  const local = {
    ...ancestor,
    id: "local",
    scopeInstanceId: "child",
    value: { type: "string" as const, value: "red" },
  };
  $instances.set(
    new Map([
      [parent.id, parent],
      [child.id, child],
    ])
  );
  $dataSources.set(
    new Map([
      [ancestor.id, ancestor],
      [local.id, local],
    ])
  );
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  return { container, local };
};

test("Option-click local variable label opens Delete confirmation without editing", async () => {
  const { container, local } = setup();
  $pages.set(createDefaultPages({ rootInstanceId: "parent" }));
  $selectedPageId.set("home");
  selectInstance(["child"]);
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <__testing__.VariablesItem
          variable={local}
          source="local"
          index={0}
          value="red"
          usageCount={2}
        />
      </TooltipProvider>
    )
  );
  const label = container.querySelector("label")!;
  await act(async () => {
    label.dispatchEvent(
      new MouseEvent("click", { bubbles: true, altKey: true })
    );
  });
  expect(document.body.textContent).toContain("Delete confirmation");
  expect(document.body.textContent).toContain(
    'Delete "Color" variable from the project? It is used in 2 expressions.'
  );
  expect(document.body.textContent).not.toContain("Edit variable");
  const deleteButton = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')
  ).find((button) => button.textContent?.trim() === "Delete");
  expect(deleteButton).not.toBeUndefined();
  await act(async () => await userEvent.click(deleteButton!));
  await expect.poll(() => $dataSources.get().has(local.id)).toBe(false);
});

test.each(["formState", "results", "errors"] as const)(
  "Option-click cannot delete required Form variable %s",
  async (name) => {
    const variable = {
      id: `form-${name}`,
      type: "variable" as const,
      name,
      scopeInstanceId: "form",
      value:
        name === "formState"
          ? ({ type: "string", value: "initial" } as const)
          : ({ type: "json", value: [] } as const),
    };
    const reference = encodeDataSourceVariable(variable.id);
    $instances.set(
      new Map([
        [
          "form",
          {
            id: "form",
            type: "instance" as const,
            component: "NativeForm",
            children: [],
          },
        ],
      ])
    );
    $pages.set(createDefaultPages({ rootInstanceId: "form" }));
    $selectedPageId.set("home");
    selectInstance(["form"]);
    $dataSources.set(new Map([[variable.id, variable]]));
    $props.set(
      new Map([
        [
          "form-state-binding",
          name === "formState"
            ? {
                id: "form-state-binding",
                instanceId: "form",
                name: "state",
                type: "expression",
                value: reference,
              }
            : {
                id: "form-state-binding",
                instanceId: "form",
                name: "onResultChange",
                type: "action",
                value: [
                  {
                    type: "execute",
                    args: ["result"],
                    code: `({ ${name}: ${reference} = result.${name} })`,
                  },
                ],
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
          <__testing__.VariablesItem
            variable={variable}
            source="local"
            index={0}
            value={undefined}
            usageCount={0}
          />
        </TooltipProvider>
      )
    );
    const label = container.querySelector("label")!;
    await act(async () =>
      label.dispatchEvent(
        new MouseEvent("click", { bubbles: true, altKey: true })
      )
    );

    expect($dataSources.get().has(variable.id)).toBe(true);
    expect(document.body.textContent).not.toContain("Delete confirmation");
  }
);

test("keeps a variable highlighted while its edit dialog is open", async () => {
  const { container, local } = setup();
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <__testing__.VariablesItem
          variable={local}
          source="local"
          index={0}
          value="red"
          usageCount={0}
        />
      </TooltipProvider>
    )
  );
  const row = container.querySelector<HTMLButtonElement>(
    '[aria-label="Variable Color"]'
  )!;
  await act(async () => await userEvent.click(row));
  await expect.poll(() => row.getAttribute("data-state")).toBe("open");
});

test("a variable without an instance scope is labeled as coming from Global root", async () => {
  const { container, local } = setup();
  const globalVariable = {
    ...local,
    id: "global-variable",
    scopeInstanceId: undefined,
    name: "Ghost URL",
  };
  $dataSources.set(new Map([[globalVariable.id, globalVariable]]));
  await act(async () =>
    root?.render(
      <TooltipProvider delayDuration={0}>
        <__testing__.VariablesItem
          variable={globalVariable}
          source="remote"
          index={0}
          value="https://example.com"
          usageCount={0}
        />
      </TooltipProvider>
    )
  );
  await act(
    async () => await userEvent.hover(container.querySelector("label")!)
  );
  expect(document.body.textContent).toContain("Global root");
  expect(document.body.textContent).not.toContain("System");
});

test("Variables list preview uses server browser info after Preview submission", async () => {
  const { container } = setup();
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
  const variable = {
    id: "browser-info",
    type: "parameter" as const,
    name: "browserInfo",
    scopeInstanceId: "form",
  };
  recordPreviewBrowserInfo("form", {
    ip: "203.0.113.10",
    referrer: "https://builder.example/project",
  });
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <__testing__.VariablesItem
          variable={variable}
          source="local"
          index={0}
          value={undefined}
          usageCount={0}
        />
      </TooltipProvider>
    )
  );
  const preview = container.querySelector<HTMLSpanElement>("span[title]");
  expect(preview?.title).toContain("203.0.113.10");
  expect(preview?.title).toContain("builder.example/project");
});

test.each([
  ["formData", "Submitted field values from this Form, keyed by input name."],
  [
    "browserInfo",
    "Visitor IP address, browser, language, and referrer available to this Form.",
  ],
  ["formState", "The current Form state: initial, success, or error."],
  [
    "results",
    "Responses from selected actions, in order. Each includes the resource name, HTTP status code, and response body.",
  ],
  [
    "errors",
    "Errors from failed actions, in order. Each includes the resource name, HTTP status code, response body, and message.",
  ],
] as const)(
  "shows the approved %s Form variable description",
  async (name, description) => {
    const { container } = setup();
    $instances.set(
      new Map([
        [
          "form",
          {
            id: "form",
            type: "instance" as const,
            component: "NativeForm",
            children: [],
          },
        ],
      ])
    );
    const variable =
      name === "formData" || name === "browserInfo"
        ? {
            id: `form-${name}`,
            type: "parameter" as const,
            name,
            scopeInstanceId: "form",
          }
        : {
            id: `form-${name}`,
            type: "variable" as const,
            name,
            scopeInstanceId: "form",
            value: { type: "json" as const, value: {} },
          };
    $dataSources.set(new Map([[variable.id, variable]]));
    await act(async () =>
      root?.render(
        <TooltipProvider delayDuration={0}>
          <__testing__.VariablesItem
            variable={variable}
            source="local"
            index={0}
            value={undefined}
            usageCount={0}
          />
        </TooltipProvider>
      )
    );
    await act(
      async () => await userEvent.hover(container.querySelector("label")!)
    );
    expect(document.body.textContent).toContain(description);
  }
);

test("clicking an ancestor source label selects and focuses its defining instance", async () => {
  const { container } = setup();
  const ancestor = $dataSources.get().get("ancestor")!;
  $pages.set(createDefaultPages({ rootInstanceId: "parent" }));
  $selectedPageId.set("home");
  selectInstance(["child"]);
  await act(async () =>
    root?.render(
      <TooltipProvider delayDuration={0}>
        <CollapsibleProvider initialOpen="Variables">
          <__testing__.VariablesItem
            variable={ancestor}
            source="remote"
            index={0}
            value="blue"
            usageCount={0}
          />
        </CollapsibleProvider>
      </TooltipProvider>
    )
  );
  const variableLabel = Array.from(container.querySelectorAll("label")).find(
    (label) => label.textContent?.trim() === "Color"
  )!;
  await act(async () => await userEvent.hover(variableLabel));
  await act(
    async () => await new Promise((resolve) => setTimeout(resolve, 10))
  );
  expect(document.body.textContent).toContain("Value comes from");
  const tooltipButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[role="tooltip"] button')
  );
  const sourceButton = tooltipButtons.find(
    (button) => button.textContent?.trim() === "Body"
  );
  expect(sourceButton).not.toBeUndefined();
  expect(sourceButton?.closest('[role="tooltip"]')?.textContent).toContain(
    "Value comes from"
  );
  await act(async () =>
    sourceButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  );
  expect($selectedInstanceSelector.get()?.[0]).toBe("parent");
  await expect.poll(() => $variableToFocus.get()).toBeUndefined();
  await expect
    .poll(() => document.activeElement?.getAttribute("aria-label"))
    .toBe("Variable Color");
});

test("clicking a Global root source selects and focuses Global root on the current page", async () => {
  const { container, local } = setup();
  const globalVariable = {
    ...local,
    id: "global-variable",
    scopeInstanceId: undefined,
    name: "Global Color",
    value: { type: "string" as const, value: "green" },
  };
  $dataSources.set(new Map([[globalVariable.id, globalVariable]]));
  $pages.set(createDefaultPages({ rootInstanceId: "parent" }));
  $selectedPageId.set("home");
  selectInstance(["child"]);
  await act(async () =>
    root?.render(
      <TooltipProvider delayDuration={0}>
        <__testing__.VariablesItem
          variable={globalVariable}
          source="remote"
          index={0}
          value="green"
          usageCount={0}
        />
      </TooltipProvider>
    )
  );
  const variableLabel = Array.from(container.querySelectorAll("label")).find(
    (label) => label.textContent?.trim() === "Global Color"
  )!;
  await act(async () => await userEvent.hover(variableLabel));
  const globalRootButton = await vi.waitFor(() => {
    const button = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[role="tooltip"] button')
    ).find((element) => element.textContent?.trim() === "Global root");
    expect(button).toBeDefined();
    return button!;
  });
  expect(document.querySelector('[role="tooltip"]')?.textContent).toContain(
    "Value comes from"
  );
  await act(async () => {
    globalRootButton.dispatchEvent(
      new MouseEvent("click", { bubbles: true, button: 0 })
    );
  });

  expect($selectedPageId.get()).toBe("home");
  expect($selectedInstanceSelector.get()?.[0]).toBe(ROOT_INSTANCE_ID);
  await expect.poll(() => $variableToFocus.get()).toBeUndefined();
  expect(document.activeElement?.getAttribute("aria-label")).toBe(
    "Variable Global Color"
  );
});

test("name shadow warning appears for an existing shadow and renamed ancestor name", async () => {
  const { container, local } = setup();
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <popoverTesting.NameField variable={local} defaultValue="Color" />
      </TooltipProvider>
    )
  );
  expect(container.querySelector("svg")).not.toBeNull();
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <popoverTesting.NameField
          key="rename"
          variable={{ ...local, name: "Other" }}
          defaultValue="Other"
        />
      </TooltipProvider>
    )
  );
  const input = container.querySelector("input")!;
  await act(async () => await userEvent.fill(input, "Color"));
  expect(container.querySelector("svg")).not.toBeNull();
  expect(input.validity.valid).toBe(true);
  await act(async () => await userEvent.fill(input, "Unique"));
  expect(container.querySelector("svg")).toBeNull();
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <__testing__.VariablesItem
          variable={local}
          source="local"
          index={0}
          value="red"
          usageCount={0}
        />
      </TooltipProvider>
    )
  );
  expect(
    Array.from(container.querySelectorAll("svg")).some(
      (icon) => icon.getAttribute("color") === "var(--foreground-warning)"
    )
  ).toBe(true);
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <__testing__.VariablesItem
          variable={{ ...local, name: "Unique" }}
          source="local"
          index={0}
          value="red"
          usageCount={0}
        />
      </TooltipProvider>
    )
  );
  expect(
    container.querySelector('svg[color="var(--foreground-warning)"]')
  ).toBeNull();
});

test("clicking an Action opens its Resource editor and highlights its Variables row", async () => {
  const { container } = setup();
  const scrollIntoView = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
  const resourceVariable = {
    id: "request-variable",
    scopeInstanceId: "child",
    type: "resource" as const,
    name: "Request",
    resourceId: "request",
  };
  $dataSources.set(new Map([[resourceVariable.id, resourceVariable]]));
  $resources.set(
    new Map([
      [
        "request",
        {
          id: "request",
          name: "request",
          method: "post",
          url: '"https://example.com"',
          headers: [],
        },
      ],
    ])
  );
  $pages.set(createDefaultPages({ rootInstanceId: "parent" }));
  $selectedPageId.set("home");
  selectInstance(["child"]);
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <CollapsibleProvider initialOpen="Variables">
          <FormSubmissionControl
            instanceId="child"
            prop={{
              id: "action",
              instanceId: "child",
              name: "action",
              type: "json",
              value: [{ dataSourceId: resourceVariable.id, enabled: true }],
            }}
            onChange={() => {}}
            propName="action"
            computedValue={[]}
            meta={{
              type: "json",
              control: "form-submission",
              required: false,
            }}
          />
          <VariablesSection />
        </CollapsibleProvider>
      </TooltipProvider>
    )
  );
  const row = () =>
    container.querySelector<HTMLButtonElement>(
      '[aria-label="Variable Request"]'
    );
  const action = container.querySelector<HTMLButtonElement>(
    '[aria-label="Action Request"]'
  )!;
  const variablesSectionToggle = container.querySelector<HTMLButtonElement>(
    'button[data-state="open"]'
  )!;
  expect($selectedInstanceSelector.get()?.[0]).toBe("child");
  await act(async () => await userEvent.click(variablesSectionToggle));
  expect(variablesSectionToggle.getAttribute("data-state")).toBe("closed");
  await act(async () => await userEvent.hover(action));
  await act(async () => {
    container
      .querySelector("[data-drag-handle]")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect($variableToFocus.get()).toBeUndefined();
  expect($variableToOpen.get()).toBeUndefined();
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  await act(
    async () =>
      await userEvent.click(
        container.querySelector<HTMLButtonElement>(
          '[aria-label="Disable action Request"]'
        )!
      )
  );
  expect($variableToFocus.get()).toBeUndefined();
  expect($variableToOpen.get()).toBeUndefined();
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  await act(
    async () =>
      await userEvent.click(
        container.querySelector<HTMLButtonElement>(
          '[aria-label="Remove action Request"]'
        )!
      )
  );
  expect($variableToFocus.get()).toBeUndefined();
  expect($variableToOpen.get()).toBeUndefined();
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  await act(async () => await userEvent.click(action));
  expect(document.body.textContent).toContain("Edit variable");
  expect(scrollIntoView).toHaveBeenCalledWith({
    block: "nearest",
    behavior: "smooth",
  });
  expect(row()?.getAttribute("data-state")).toBe("open");
  expect(variablesSectionToggle.getAttribute("data-state")).toBe("open");
  expect($selectedInstanceSelector.get()?.[0]).toBe("child");
  expect($selectedPageId.get()).toBe("home");
  expect($variableToOpen.get()).toBeUndefined();
});

test("an Action Resource unavailable in Variables does not open a stale dialog", async () => {
  const { container } = setup();
  const parentResource = {
    id: "parent-resource",
    scopeInstanceId: "parent",
    type: "resource" as const,
    name: "Request",
    resourceId: "parent-request",
  };
  const localResource = {
    ...parentResource,
    id: "local-resource",
    scopeInstanceId: "child",
    resourceId: "local-request",
  };
  $dataSources.set(
    new Map([
      [parentResource.id, parentResource],
      [localResource.id, localResource],
    ])
  );
  $resources.set(
    new Map([
      [
        parentResource.resourceId,
        {
          id: parentResource.resourceId,
          name: "parent-request",
          method: "post",
          url: '"https://example.com"',
          headers: [],
        },
      ],
      [
        localResource.resourceId,
        {
          id: localResource.resourceId,
          name: "local-request",
          method: "post",
          url: '"https://example.com"',
          headers: [],
        },
      ],
    ])
  );
  $pages.set(createDefaultPages({ rootInstanceId: "parent" }));
  $selectedPageId.set("home");
  $props.set(new Map());
  selectInstance(["child"]);

  await act(async () =>
    root?.render(
      <TooltipProvider>
        <CollapsibleProvider initialOpen="Variables">
          <FormSubmissionControl
            instanceId="child"
            propName="action"
            prop={{
              id: "action",
              instanceId: "child",
              name: "action",
              type: "json",
              value: [{ dataSourceId: parentResource.id, enabled: true }],
            }}
            computedValue={[]}
            meta={{ type: "json", control: "form-submission", required: false }}
            onChange={() => {}}
          />
          <VariablesSection />
        </CollapsibleProvider>
      </TooltipProvider>
    )
  );
  await act(async () => {});

  const sectionButton = container.querySelector<HTMLButtonElement>(
    'button[data-state="open"]'
  )!;
  await act(async () => await userEvent.click(sectionButton));
  expect(sectionButton.getAttribute("data-state")).toBe("closed");

  await act(
    async () =>
      await userEvent.click(
        container.querySelector<HTMLButtonElement>(
          '[aria-label="Action Request"]'
        )!
      )
  );

  expect($variableToFocus.get()).toBeUndefined();
  expect($variableToOpen.get()).toBeUndefined();
  expect(sectionButton.getAttribute("data-state")).toBe("closed");
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
