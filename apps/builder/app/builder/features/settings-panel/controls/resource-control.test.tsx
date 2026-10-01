import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { page } from "@vitest/browser/context";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import type { DataSource, Instance, Prop, Resource } from "@webstudio-is/sdk";
import { selectInstance } from "~/shared/nano-states";
import {
  $dataSources,
  $instances,
  $resources,
} from "~/shared/sync/data-stores";
import { createDefaultPages } from "@webstudio-is/project-build";
import { $pages } from "~/shared/sync/data-stores";
import { registerContainers, serverSyncStore } from "~/shared/sync/sync-stores";
import { ResourceControl } from "./resource-control";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
registerContainers();
const initialPages = $pages.get();
let root: Root;
let container: HTMLDivElement;
const resource: Resource = {
  id: "request",
  name: "Submit contact",
  method: "post",
  url: '"https://example.com/contact"',
  headers: [{ name: "Content-Type", value: '"application/json"' }],
  searchParams: [{ name: "source", value: '"website"' }],
  body: '{ message: "existing body" }',
};
const variable: DataSource = {
  type: "resource",
  id: "request-variable",
  name: "Submit contact",
  resourceId: resource.id,
  scopeInstanceId: "body",
};
beforeEach(() => {
  container = document.createElement("div");
  container.dataset.floatingPanelContainer = "";
  document.body.appendChild(container);
  root = createRoot(container);
  $instances.set(
    new Map<string, Instance>([
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
        { type: "instance", id: "form", component: "Form", children: [] },
      ],
      [
        "sibling",
        { type: "instance", id: "sibling", component: "Box", children: [] },
      ],
    ])
  );
  $dataSources.set(new Map([[variable.id, variable]]));
  $resources.set(new Map([[resource.id, resource]]));
  $pages.set(createDefaultPages({ rootInstanceId: "body" }));
  selectInstance(["form", "body"]);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  serverSyncStore.transactionManager.currentStack = [];
  serverSyncStore.transactionManager.undoneStack = [];
  serverSyncStore.popAll();
  selectInstance(undefined);
  $pages.set(initialPages);
  $instances.set(new Map());
  $dataSources.set(new Map());
  $resources.set(new Map());
});
const render = async (prop?: Prop) => {
  const onChange = vi.fn();
  await act(async () =>
    root.render(
      <TooltipProvider>
        <ResourceControl
          instanceId="form"
          propName="action"
          prop={prop}
          computedValue=""
          meta={{ type: "resource", control: "resource", required: false }}
          onChange={onChange}
        />
      </TooltipProvider>
    )
  );
  return onChange;
};

test("selects an existing Resource in scope without copying its configuration", async () => {
  $dataSources.set(
    new Map([
      [variable.id, variable],
      [
        "sibling-variable",
        {
          ...variable,
          id: "sibling-variable",
          name: "Private request",
          scopeInstanceId: "sibling",
          resourceId: "private-request",
        },
      ],
    ])
  );
  $resources.set(
    new Map([
      [resource.id, resource],
      ["private-request", { ...resource, id: "private-request" }],
    ])
  );
  const onChange = await render();
  await act(async () =>
    page.getByRole("combobox", { name: "Action source" }).click()
  );
  expect(
    page.getByRole("option", { name: "Private request" }).query()
  ).toBeNull();
  await act(async () =>
    page.getByRole("option", { name: "Submit contact", exact: true }).click()
  );
  expect(onChange).toHaveBeenCalledWith({
    type: "resource",
    value: resource.id,
  });
  expect($resources.get().get(resource.id)).toEqual(resource);
});

test("edits the selected Resource through the full variable editor", async () => {
  await render({
    id: "action",
    instanceId: "form",
    name: "action",
    type: "resource",
    value: resource.id,
  });
  await act(async () =>
    page.getByRole("button", { name: "Edit Resource variable" }).click()
  );
  await vi.waitFor(() =>
    expect(page.getByText("Search params", { exact: true })).toBeVisible()
  );
  expect(page.getByText("Body", { exact: true })).toBeVisible();
  expect(document.activeElement).toBe(
    document.querySelector('textarea[name="url-validator"]')
  );
  await act(async () =>
    page
      .getByRole("textbox", { name: "URL", exact: true })
      .fill("https://example.com/updated")
  );
  await act(async () => {
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await new Promise(requestAnimationFrame);
  });
  await vi.waitFor(() =>
    expect($resources.get().get(resource.id)?.url).toBe(
      '"https://example.com/updated"'
    )
  );
  expect($dataSources.get().size).toBe(1);
  expect($resources.get().size).toBe(1);
  expect($resources.get().get(resource.id)?.searchParams).toEqual(
    resource.searchParams
  );
  expect($resources.get().get(resource.id)?.body).toEqual(resource.body);
});

test("entering a URL keeps a plain action instead of creating an inline Resource", async () => {
  const onChange = await render();
  await act(async () =>
    page
      .getByRole("textbox", { name: "Action URL" })
      .fill("https://example.com/new")
  );
  await act(async () =>
    page.getByRole("combobox", { name: "Action source" }).click()
  );
  expect(onChange).toHaveBeenCalledWith({
    type: "string",
    value: "https://example.com/new",
  });
  expect($resources.get().size).toBe(1);
});

test("turns a legacy inline Resource into a variable without losing its settings", async () => {
  $dataSources.set(new Map());
  await render({
    id: "action",
    instanceId: "form",
    name: "action",
    type: "resource",
    value: resource.id,
  });
  await act(async () =>
    page.getByRole("button", { name: "Make Resource variable" }).click()
  );
  expect(Array.from($dataSources.get().values())).toContainEqual(
    expect.objectContaining({
      type: "resource",
      resourceId: resource.id,
      scopeInstanceId: "form",
    })
  );
  expect($resources.get().get(resource.id)).toEqual(resource);
});

test("adds another Resource and email without replacing the selected Resource", async () => {
  const secondVariable = {
    ...variable,
    id: "second-variable",
    resourceId: "second",
    name: "Newsletter",
  };
  $dataSources.set(
    new Map([
      [variable.id, variable],
      [secondVariable.id, secondVariable],
    ])
  );
  $resources.set(
    new Map([
      [resource.id, resource],
      ["second", { ...resource, id: "second" }],
    ])
  );
  const onChange = await render({
    id: "action",
    instanceId: "form",
    name: "action",
    type: "resource",
    value: { resourceIds: [resource.id], includeEmail: false },
  });
  await act(async () =>
    page.getByRole("combobox", { name: "Add Resource action" }).click()
  );
  expect(
    page.getByRole("option", { name: "Submit contact", exact: true }).query()
  ).toBeNull();
  await act(async () =>
    page.getByRole("option", { name: "Newsletter", exact: true }).click()
  );
  expect(onChange).toHaveBeenCalledWith({
    type: "resource",
    value: { resourceIds: [resource.id, "second"], includeEmail: false },
  });
  await act(async () =>
    page.getByRole("checkbox", { name: "Send email" }).click()
  );
  expect(onChange).toHaveBeenCalledWith({
    type: "resource",
    value: { resourceIds: [resource.id], includeEmail: true },
  });
  await act(async () =>
    page.getByRole("button", { name: "Remove Submit contact" }).click()
  );
  expect(onChange).toHaveBeenCalledWith({
    type: "resource",
    value: { resourceIds: [], includeEmail: false },
  });
});
