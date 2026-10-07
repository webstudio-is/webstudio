import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { userEvent } from "@vitest/browser/context";
import { afterEach, expect, test } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  $selectedInstanceSelector,
  $selectedPageId,
  selectInstance,
} from "~/shared/nano-states";
import { $pages, $resources } from "~/shared/sync/data-stores";
import { FormSubmissionControl } from "./controls/form-submission";
import { $highlightedVariable } from "./variable-navigation";
import { TooltipProvider } from "@webstudio-is/design-system";
import { $instances, $dataSources } from "~/shared/sync/data-stores";
import { __testing__ } from "./variables-section";
import { __testing__ as popoverTesting } from "./variable-popover";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  $highlightedVariable.set(undefined);
  selectInstance(undefined);
  $pages.set(undefined);
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

test("clicking an Action navigates to and highlights its Resource without opening the editor", async () => {
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
  await act(
    async () =>
      await userEvent.click(
        container.querySelector<HTMLButtonElement>(
          '[aria-label="Action Request"]'
        )!
      )
  );
  expect($selectedInstanceSelector.get()?.[0]).toBe("child");
  const row = container.querySelector<HTMLButtonElement>(
    '[aria-label="Variable Request"]'
  )!;
  expect(row.getAttribute("data-active")).toBe("true");
  expect(document.activeElement).toBe(row);
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(document.body.textContent).not.toContain("Edit variable");
});
