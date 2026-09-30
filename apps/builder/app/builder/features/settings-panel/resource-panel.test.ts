import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { page } from "@vitest/browser/context";
import { afterEach, expect, test, vi } from "vitest";
import {
  encodeDataVariableId,
  type DataSources,
  type Resource,
} from "@webstudio-is/sdk";
import { FloatingPanel, TooltipProvider } from "@webstudio-is/design-system";
import { $resources } from "~/shared/sync/data-stores";
import {
  getResourceScopeForInstance,
  Headers,
  ResourceForm,
  UrlField,
} from "./resource-panel";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
const initialResources = $resources.get();
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  $resources.set(initialResources);
  document.body.innerHTML = "";
});

test("includes resource documents when building another resource expression", () => {
  const dataSources: DataSources = new Map([
    [
      "resourceDataSource",
      {
        type: "resource",
        id: "resourceDataSource",
        name: "Author",
        resourceId: "authorResource",
      },
    ],
  ]);
  const document = { data: { id: 1 } };
  const { scope, variableValues } = getResourceScopeForInstance({
    page: undefined,
    instanceKey: "body",
    dataSources,
    variableValuesByInstanceSelector: new Map([
      ["body", new Map([["resourceDataSource", document]])],
    ]),
    includeResourceDataSources: true,
  });

  expect(scope[encodeDataVariableId("resourceDataSource")]).toBe(document);
  expect(variableValues.get("resourceDataSource")).toBe(document);
});

test("notifies the preview when a resource field changes", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const onChange = vi.fn();
  act(() => {
    root?.render(
      createElement(
        TooltipProvider,
        undefined,
        createElement(ResourceForm, { onChange })
      )
    );
  });

  const addSearchParam = container.querySelector<HTMLButtonElement>(
    '[aria-label="Add another search param"]'
  );
  expect(addSearchParam).not.toBeNull();
  act(() => addSearchParam?.click());
  expect(onChange).toHaveBeenCalledOnce();
});

test("invalidates the preview as soon as a body edit starts", () => {
  const resource: Resource = {
    id: "request",
    name: "Request",
    method: "post",
    url: '"https://example.com"',
    headers: [{ name: "Content-Type", value: '"text/plain"' }],
    body: '"original"',
  };
  $resources.set(new Map([[resource.id, resource]]));
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const onChange = vi.fn();
  act(() => {
    root?.render(
      createElement(
        TooltipProvider,
        undefined,
        createElement(ResourceForm, {
          variable: {
            type: "resource",
            id: "request-variable",
            name: "Request",
            resourceId: resource.id,
          },
          onChange,
        })
      )
    );
  });

  const body = container.querySelector<HTMLTextAreaElement>(
    "textarea:not([name])"
  );
  expect(body).not.toBeNull();
  act(() => {
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value"
    )?.set;
    setValue?.call(body, "changed");
    body?.dispatchEvent(new Event("input", { bubbles: true }));
    expect(onChange).toHaveBeenCalledOnce();
  });
});

test("focuses the resource URL when requested", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      createElement(
        TooltipProvider,
        undefined,
        createElement(FloatingPanel, {
          title: "Edit resource",
          open: true,
          children: createElement("button", undefined, "Edit resource"),
          content: createElement(UrlField, {
            autoFocus: true,
            aliases: new Map(),
            scope: {},
            value: '"https://example.com"',
            onChange: vi.fn(),
            onCurlPaste: vi.fn(),
          }),
        })
      )
    );
  });
  expect(document.activeElement).toBe(
    document.querySelector('textarea[name="url-validator"]')
  );
});

test("suggests request header names and known values", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const onChange = vi.fn();
  const onOpenChange = vi.fn();
  await act(async () => {
    root?.render(
      createElement(
        TooltipProvider,
        undefined,
        createElement(FloatingPanel, {
          title: "Edit resource",
          open: true,
          onOpenChange,
          children: createElement("button", undefined, "Edit resource"),
          content: createElement(Headers, {
            aliases: new Map(),
            scope: {},
            headers: [{ name: "Content-Type", value: '"application/json"' }],
            onChange,
            suggestHeaders: true,
          }),
        })
      )
    );
  });
  await act(async () => page.getByPlaceholder("Value").fill("text"));
  expect(
    Array.from(document.querySelectorAll('[role="option"]')).map(
      (option) => option.textContent
    )
  ).toContain("text/plain");
  await act(async () =>
    page.getByRole("option", { name: "text/plain", exact: true }).click()
  );
  expect(onChange).toHaveBeenCalledWith([
    { name: "Content-Type", value: '"text/plain"' },
  ]);
  expect(onOpenChange).not.toHaveBeenCalledWith(false);
  expect(page.getByRole("dialog")).toBeVisible();

  await act(async () => page.getByPlaceholder("Name").fill("Auth"));
  expect(
    Array.from(document.querySelectorAll('[role="option"]')).map(
      (option) => option.textContent
    )
  ).toContain("Authorization");

  await act(async () => page.getByPlaceholder("Name").fill("X-Custom"));
  expect(onChange).toHaveBeenCalledWith([
    { name: "X-Custom", value: '"application/json"' },
  ]);
});
