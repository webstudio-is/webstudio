import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { userEvent } from "@vitest/browser/context";
import { afterEach, expect, test } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import { CollapsibleProvider } from "~/builder/shared/collapsible-section";
import {
  $selectedInstanceSelector,
  $selectedPageId,
  selectInstance,
} from "~/shared/nano-states";
import { ROOT_INSTANCE_ID } from "@webstudio-is/sdk";
import { $pages, $props, $resources } from "~/shared/sync/data-stores";
import { FormSubmissionControl } from "./controls/form-submission";
import { $variableToFocus } from "./variable-navigation";
import { showVariableAtSource } from "./variable-navigation";
import { TooltipProvider } from "@webstudio-is/design-system";
import { $instances, $dataSources } from "~/shared/sync/data-stores";
import { __testing__, VariablesSection } from "./variables-section";
import { __testing__ as popoverTesting } from "./variable-popover";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  $variableToFocus.set(undefined);
  selectInstance(undefined);
  $pages.set(undefined);
  $props.set(new Map());
  $resources.set(new Map());
  $instances.set(new Map());
  $dataSources.set(new Map());
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

test("clicking a value source navigates to its instance and focuses the variable", async () => {
  const { container } = setup();
  $pages.set(createDefaultPages({ rootInstanceId: "parent" }));
  $selectedPageId.set("home");
  selectInstance(["child"]);
  await act(async () =>
    root?.render(
      <TooltipProvider delayDuration={0}>
        <CollapsibleProvider initialOpen="Variables">
          <button
            type="button"
            onClick={() => showVariableAtSource("ancestor", "parent")}
          >
            Go to source
          </button>
          <VariablesSection />
        </CollapsibleProvider>
      </TooltipProvider>
    )
  );
  const sectionButton = container.querySelector<HTMLButtonElement>(
    'button[data-state="open"]'
  )!;
  await act(async () => {
    sectionButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(sectionButton.getAttribute("data-state")).toBe("closed");
  const sourceButton = Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent === "Go to source"
  )!;
  await act(async () => {
    sourceButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect($selectedInstanceSelector.get()?.[0]).toBe("parent");
  expect($variableToFocus.get()).toBeUndefined();
  expect(document.activeElement?.getAttribute("aria-label")).toBe(
    "Variable Color"
  );
});

test("clicking a Global root source keeps the current page selected", () => {
  $pages.set(createDefaultPages({ rootInstanceId: "parent" }));
  $selectedPageId.set("home");
  selectInstance(["child"]);

  showVariableAtSource("global-variable", ROOT_INSTANCE_ID);

  expect($selectedPageId.get()).toBe("home");
  expect($selectedInstanceSelector.get()?.[0]).toBe(ROOT_INSTANCE_ID);
  expect($variableToFocus.get()).toEqual({
    id: "global-variable",
    scopeInstanceId: ROOT_INSTANCE_ID,
  });
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
});

test("clicking an Action focuses its Resource without navigating or opening the editor", async () => {
  const { container, local } = setup();
  const resourceVariable = {
    id: local.id,
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
  selectInstance(["parent"]);
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <FormSubmissionControl
          instanceId="child"
          propName="action"
          prop={{
            id: "action",
            instanceId: "child",
            name: "action",
            type: "json",
            value: [{ dataSourceId: resourceVariable.id, enabled: true }],
          }}
          computedValue={[]}
          meta={{ type: "json", control: "form-submission", required: false }}
          onChange={() => {}}
        />
        <__testing__.VariablesItem
          variable={resourceVariable}
          source="local"
          index={0}
          value={undefined}
          usageCount={1}
        />
      </TooltipProvider>
    )
  );
  expect($selectedInstanceSelector.get()?.[0]).toBe("parent");
  const row = container.querySelector<HTMLButtonElement>(
    '[aria-label="Variable Request"]'
  )!;
  const action = container.querySelector<HTMLButtonElement>(
    '[aria-label="Action Request"]'
  )!;
  await act(async () => await userEvent.hover(action));
  await act(async () => {
    container
      .querySelector("[data-drag-handle]")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect($variableToFocus.get()).toBeUndefined();
  await act(
    async () =>
      await userEvent.click(
        container.querySelector<HTMLButtonElement>(
          '[aria-label="Disable action Request"]'
        )!
      )
  );
  expect($variableToFocus.get()).toBeUndefined();
  await act(
    async () =>
      await userEvent.click(
        container.querySelector<HTMLButtonElement>(
          '[aria-label="Remove action Request"]'
        )!
      )
  );
  expect($variableToFocus.get()).toBeUndefined();

  await act(
    async () =>
      await userEvent.click(
        container.querySelector<HTMLButtonElement>(
          '[aria-label="Action Request"]'
        )!
      )
  );
  expect(row.getAttribute("data-active")).not.toBe("true");
  expect(document.activeElement).toBe(row);
  expect($variableToFocus.get()).toBeUndefined();
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(document.body.textContent).not.toContain("Edit variable");
});

test("an unavailable Action Resource does not reopen Variables or retain focus", async () => {
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
  expect(sectionButton.getAttribute("data-state")).toBe("closed");
});
