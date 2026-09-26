import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import {
  encodeDataVariableId,
  type DataSources,
  type Resource,
} from "@webstudio-is/sdk";
import { TooltipProvider } from "@webstudio-is/design-system";
import { $resources } from "~/shared/sync/data-stores";
import { getResourceScopeForInstance, ResourceForm } from "./resource-panel";

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
