import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import { encodeDataVariableId, type DataSources } from "@webstudio-is/sdk";
import { TooltipProvider } from "@webstudio-is/design-system";
import { getResourceScopeForInstance, ResourceForm } from "./resource-panel";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
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
