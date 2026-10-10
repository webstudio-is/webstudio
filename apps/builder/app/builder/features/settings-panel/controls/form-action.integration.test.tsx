import { useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { userEvent } from "@vitest/browser/context";
import { afterEach, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import type { Prop } from "@webstudio-is/sdk";
import { createDefaultPages } from "@webstudio-is/project-build";
import { selectInstance } from "~/shared/nano-states";
import { $selectedPageId } from "~/shared/nano-states/pages";
import {
  $assets,
  $breakpoints,
  $dataSources,
  $instances,
  $pages,
  $projectSettings,
  $props,
  $resources,
  $styleSourceSelections,
  $styleSources,
  $styles,
} from "~/shared/sync/data-stores";
import { registerContainers, serverSyncStore } from "~/shared/sync/sync-stores";
import { FormActionControl } from "./form-action";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

registerContainers();
let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  selectInstance(undefined);
  document.body.innerHTML = "";
});

test("Actions references an existing Resource without creating another", async () => {
  serverSyncStore.transactionManager.currentStack = [];
  serverSyncStore.transactionManager.undoneStack = [];
  serverSyncStore.popAll();
  const pages = createDefaultPages({
    rootInstanceId: "body",
    homePageId: "home",
  });
  $pages.set(pages);
  $selectedPageId.set("home");
  $instances.set(
    new Map([
      [
        "body",
        {
          type: "instance" as const,
          id: "body",
          component: "Body",
          children: [{ type: "id" as const, value: "form" }],
        },
      ],
      [
        "form",
        {
          type: "instance" as const,
          id: "form",
          component: "NativeForm",
          children: [],
        },
      ],
    ])
  );
  $props.set(new Map());
  $breakpoints.set(new Map());
  $styleSourceSelections.set(new Map());
  $styleSources.set(new Map());
  $styles.set(new Map());
  $dataSources.set(
    new Map([
      [
        "send",
        {
          type: "resource" as const,
          id: "send",
          scopeInstanceId: "form",
          name: "Send request",
          resourceId: "request",
        },
      ],
    ])
  );
  $resources.set(
    new Map([
      [
        "request",
        {
          id: "request",
          name: "Send request",
          method: "post" as const,
          url: '"https://example.com/submit"',
          headers: [],
        },
      ],
    ])
  );
  $assets.set(new Map());
  $projectSettings.set({ meta: {}, compiler: {} });
  selectInstance(["form"]);

  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const Harness = () => {
    const [submission, setSubmission] = useState<Prop>();
    return (
      <TooltipProvider>
        <div data-floating-panel-container>
          <FormActionControl
            instanceId="form"
            propName="action"
            prop={submission}
            computedValue={
              submission?.type === "json" ? submission.value : undefined
            }
            meta={{
              type: "json",
              control: "form-action",
              required: false,
            }}
            onChange={(value) => {
              if (value.type === "json") {
                setSubmission({
                  id: "action",
                  instanceId: "form",
                  name: "action",
                  ...value,
                });
              }
            }}
          />
        </div>
      </TooltipProvider>
    );
  };
  await act(async () => root?.render(<Harness />));
  expect(container.textContent).not.toContain(
    "Select at least one Resource destination"
  );
  expect(container.textContent).not.toContain("Create Resource in Form");
  await act(async () => {
    await userEvent.click(
      container.querySelector<HTMLButtonElement>('[aria-label="Add action"]')!
    );
  });
  const action = Array.from(
    document.querySelectorAll<HTMLElement>('[role="menuitem"]')
  ).find((item) => item.textContent === "Send request");
  expect(action).toBeDefined();
  await act(async () => await userEvent.click(action!));
  await vi.waitFor(() => {
    expect(container.querySelector('[data-list-item="true"]')).not.toBeNull();
  });
  expect($dataSources.get().size).toBe(1);
  expect($resources.get().size).toBe(1);
  expect(container.textContent).not.toContain(
    "Select at least one Resource destination"
  );
});
