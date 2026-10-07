import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { userEvent } from "@vitest/browser/context";
import { afterEach, expect, test, vi } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { DataSource } from "@webstudio-is/sdk";
import { $selectedPageId, selectInstance } from "~/shared/nano-states";
import {
  $pages,
  $instances,
  $dataSources,
  $resources,
} from "~/shared/sync/data-stores";
import { registerContainers } from "~/shared/sync/sync-stores";
import { VariableMenu } from "./variable-menu";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
registerContainers();
let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  selectInstance(undefined);
  $instances.set(new Map());
  $pages.set(undefined);
  $dataSources.set(new Map());
  $resources.set(new Map());
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("copy and paste on the same instance creates a unique variable and Resource name", async () => {
  const variable: DataSource = {
    id: "variable",
    type: "resource",
    name: "Request",
    scopeInstanceId: "scope",
    resourceId: "request",
  };
  const other: DataSource = {
    id: "other",
    type: "variable",
    name: "Request 2",
    scopeInstanceId: "scope",
    value: { type: "string", value: "" },
  };
  $instances.set(
    new Map([
      [
        "scope",
        { id: "scope", type: "instance", component: "Box", children: [] },
      ],
    ])
  );
  $pages.set(createDefaultPages({ rootInstanceId: "scope" }));
  $selectedPageId.set("home");
  selectInstance(["scope"]);
  $dataSources.set(
    new Map<string, DataSource>([
      [variable.id, variable],
      [other.id, other],
    ])
  );
  $resources.set(
    new Map([
      [
        "request",
        {
          id: "request",
          name: "Request",
          method: "get",
          url: '\"https://example.com\"',
          headers: [],
        },
      ],
    ])
  );
  let text = "";
  vi.spyOn(navigator.clipboard, "writeText").mockImplementation(
    async (value) => {
      text = value;
    }
  );
  vi.spyOn(navigator.clipboard, "readText").mockImplementation(
    async () => text
  );
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(<VariableMenu variable={variable} canDelete />)
  );
  const open = container.querySelector(
    'button[aria-label="Open variable menu"]'
  )!;
  const action = async (name: string) => {
    await act(async () => userEvent.click(open));
    const item = Array.from(
      document.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).find((item) => item.textContent === name)!;
    await act(async () => userEvent.click(item));
  };
  await action("Copy");
  await expect.poll(() => text).not.toBe("");
  await action("Paste");
  await expect.poll(() => $dataSources.get().size).toBe(3);
  const pasted = [...$dataSources.get().values()].find(
    ({ name }) => name === "Request 3"
  );
  expect(pasted?.id).not.toBe(variable.id);
  expect(pasted?.type).toBe("resource");
  if (pasted?.type !== "resource") {
    throw Error("Expected a Resource variable");
  }
  const resource = $resources.get().get(pasted.resourceId);
  expect(resource?.id).not.toBe("request");
  expect(resource?.name).toBe("Request 3");
  expect(resource?.url).toBe('\"https://example.com\"');
});
