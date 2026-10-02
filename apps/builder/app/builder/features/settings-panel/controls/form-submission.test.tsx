import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import type { Prop } from "@webstudio-is/sdk";
import { $dataSources, $instances } from "~/shared/sync/data-stores";
import { FormSubmissionControl } from "./form-submission";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
const previousInstances = $instances.get();
const previousDataSources = $dataSources.get();
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  $instances.set(previousInstances);
  $dataSources.set(previousDataSources);
  document.body.innerHTML = "";
});

test("a Form can switch to Resources and select an in-scope destination", async () => {
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
          propName="submission"
          prop={prop}
          computedValue={prop?.type === "json" ? prop.value : undefined}
          meta={{ type: "json", control: "form-submission", required: false }}
          onChange={onChange}
        />
      </TooltipProvider>
    );
  };
  await act(async () => render());
  expect(
    container.querySelector('[aria-label="Native browser form"]')
  ).not.toBeNull();
  await act(async () =>
    container
      .querySelector<HTMLButtonElement>('[aria-label="Resources"]')
      ?.click()
  );
  expect(onChange).toHaveBeenLastCalledWith({
    type: "json",
    value: { mode: "resources", destinations: [] },
  });

  await act(async () =>
    render({
      id: "submission",
      instanceId: "form",
      name: "submission",
      type: "json",
      value: { mode: "resources", destinations: [] },
    })
  );
  expect(container.textContent).toContain(
    "Select at least one Resource destination"
  );
  await act(async () =>
    container.querySelector<HTMLButtonElement>('[role="combobox"]')?.click()
  );
  const requestOption = Array.from(
    document.querySelectorAll<HTMLElement>('[role="option"]')
  ).find((option) => option.textContent?.includes("Send request"));
  await act(async () => requestOption?.click());
  const addButton = Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent === "Add"
  );
  await act(async () => addButton?.click());
  expect(onChange).toHaveBeenLastCalledWith({
    type: "json",
    value: { mode: "resources", destinations: ["resourceDataSource"] },
  });

  await act(async () =>
    render({
      id: "submission",
      instanceId: "form",
      name: "submission",
      type: "json",
      value: { mode: "resources", destinations: ["resourceDataSource"] },
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
  expect(onChange).toHaveBeenLastCalledWith({
    type: "json",
    value: { mode: "resources", destinations: ["resourceDataSource"] },
  });

  await act(async () =>
    render({
      id: "submission",
      instanceId: "form",
      name: "submission",
      type: "json",
      value: {
        mode: "resources",
        destinations: ["one", "two", "three", "four", "five"],
      },
    })
  );
  expect(container.textContent).not.toContain("Create Resource in Form");
  expect(
    Array.from(container.querySelectorAll("button")).some(
      (button) => button.textContent === "Add"
    )
  ).toBe(false);
});

test("a Form can select a Resource defined outside its scope", async () => {
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
          propName="submission"
          prop={{
            id: "submission",
            instanceId: "form",
            name: "submission",
            type: "json",
            value: { mode: "resources", destinations: [] },
          }}
          computedValue={{ mode: "resources", destinations: [] }}
          meta={{ type: "json", control: "form-submission", required: false }}
          onChange={onChange}
        />
      </TooltipProvider>
    );
  });

  await act(async () =>
    container.querySelector<HTMLButtonElement>('[role="combobox"]')?.click()
  );
  const requestOption = Array.from(
    document.querySelectorAll<HTMLElement>('[role="option"]')
  ).find((option) => option.textContent?.includes("Shared request"));
  expect(requestOption).toBeDefined();
  await act(async () => requestOption?.click());
  const addButton = Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent === "Add"
  );
  await act(async () => addButton?.click());
  expect(onChange).toHaveBeenLastCalledWith({
    type: "json",
    value: { mode: "resources", destinations: ["externalResourceId"] },
  });
});
