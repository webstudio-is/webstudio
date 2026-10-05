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
import { FormSubmissionControl } from "./form-submission";

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

test("creating a Form Resource selects it only after the editor saves", async () => {
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
  $dataSources.set(new Map());
  $resources.set(new Map());
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
          <FormSubmissionControl
            instanceId="form"
            propName="submission"
            prop={submission}
            computedValue={
              submission?.type === "json" ? submission.value : undefined
            }
            meta={{ type: "json", control: "form-submission", required: false }}
            onChange={(value) => {
              if (value.type === "json") {
                setSubmission({
                  id: "submission",
                  instanceId: "form",
                  name: "submission",
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
  await act(async () => {
    await userEvent.click(
      Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent === "Create Resource in Form"
      )!
    );
  });
  const dialog = await vi.waitFor(() => {
    const element = document.querySelector<HTMLElement>('[role="dialog"]');
    expect(element).not.toBeNull();
    return element!;
  });
  expect(container.textContent).toContain(
    "Select at least one Resource destination"
  );
  expect($dataSources.get().size).toBe(0);

  await act(async () => dialog.querySelector("form")?.requestSubmit());
  expect($dataSources.get().size).toBe(0);
  expect(container.textContent).toContain(
    "Select at least one Resource destination"
  );

  await act(async () => {
    await userEvent.fill(
      dialog.querySelector<HTMLInputElement>('input[name="name"]')!,
      "Send request"
    );
    await userEvent.fill(
      dialog.querySelector<HTMLTextAreaElement>(
        'textarea[name="url-validator"]'
      )!,
      "https://example.com/submit"
    );
  });
  expect($dataSources.get().size).toBe(0);
  expect(container.textContent).toContain(
    "Select at least one Resource destination"
  );

  await act(async () => dialog.querySelector("form")?.requestSubmit());
  await vi.waitFor(() => {
    expect($dataSources.get().size).toBe(1);
    expect(container.textContent).toContain("Send request");
    expect(container.textContent).not.toContain(
      "Select at least one Resource destination"
    );
  });
  const [created] = $dataSources.get().values();
  expect(created.type).toBe("resource");
  expect(created.scopeInstanceId).toBe("form");
  if (created.type === "resource") {
    expect($resources.get().has(created.resourceId)).toBe(true);
  }
  await act(async () => {
    await userEvent.click(container.querySelector('[data-list-item="true"]')!);
  });
  await vi.waitFor(() => {
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });
});
