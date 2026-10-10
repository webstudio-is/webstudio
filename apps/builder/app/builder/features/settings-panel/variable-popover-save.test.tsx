import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { userEvent } from "@vitest/browser/context";
import { afterEach, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import type { DataSource, Resource } from "@webstudio-is/sdk";
import { createDefaultPages } from "@webstudio-is/project-build";
import { $selectedPageId, selectInstance } from "~/shared/nano-states";
import {
  $dataSources,
  $instances,
  $pages,
  $props,
  $resources,
} from "~/shared/sync/data-stores";
import { registerContainers } from "~/shared/sync/sync-stores";
import { VariablePopoverTrigger } from "./variable-popover";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
registerContainers();
let root: Root | undefined;
const initialDataSources = $dataSources.get();
const initialResources = $resources.get();
const initialInstances = $instances.get();
const initialPages = $pages.get();
const initialProps = $props.get();

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  $dataSources.set(initialDataSources);
  $resources.set(initialResources);
  $instances.set(initialInstances);
  $pages.set(initialPages);
  $props.set(initialProps);
  selectInstance(undefined);
  $selectedPageId.set(undefined);
  document.body.innerHTML = "";
});

test.each(["new", "existing"] as const)(
  "failed %s Email save keeps the editor and draft until corrected",
  async (mode) => {
    const resource: Resource = {
      id: "email-resource",
      name: "Notify",
      control: "email",
      method: "post",
      url: '""',
      headers: [],
      email: {},
    };
    const variable: DataSource = {
      id: "email-variable",
      name: "Notify",
      type: "resource",
      resourceId: resource.id,
      scopeInstanceId: "body",
    };
    $resources.set(
      new Map(mode === "existing" ? [[resource.id, resource]] : [])
    );
    $dataSources.set(
      new Map(mode === "existing" ? [[variable.id, variable]] : [])
    );
    $instances.set(
      new Map([
        [
          "body",
          { id: "body", type: "instance", component: "Body", children: [] },
        ],
      ])
    );
    $pages.set(createDefaultPages({ rootInstanceId: "body" }));
    $props.set(new Map());
    $selectedPageId.set("home");
    selectInstance(["body"]);
    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(
        <TooltipProvider>
          <VariablePopoverTrigger
            variable={mode === "existing" ? variable : undefined}
          >
            <button type="button">Open</button>
          </VariablePopoverTrigger>
        </TooltipProvider>
      )
    );
    await act(async () => userEvent.click(container.querySelector("button")!));
    const dialog = await vi.waitFor(() => {
      const current = document.querySelector<HTMLElement>('[role="dialog"]');
      expect(current).not.toBeNull();
      return current!;
    });
    if (mode === "new") {
      await act(async () =>
        userEvent.fill(dialog.querySelector('input[name="name"]')!, "Notify")
      );
      const typeSelect = Array.from(
        dialog.querySelectorAll<HTMLElement>('[role="combobox"]')
      ).find((element) => element.textContent?.includes("String"))!;
      await act(async () => userEvent.click(typeSelect));
      await act(async () =>
        userEvent.click(
          Array.from(
            document.querySelectorAll<HTMLElement>('[role="option"]')
          ).find((option) => option.textContent?.startsWith("Email"))!
        )
      );
    }
    const sender = dialog.querySelector<HTMLInputElement>(
      'input[placeholder="Acme <acme@example.com>"]'
    )!;
    const subject = dialog.querySelector<HTMLInputElement>(
      'input[placeholder="New form submission"]'
    )!;
    await act(async () => userEvent.fill(subject, "Draft subject"));
    await act(async () => userEvent.fill(sender, "invalid sender"));
    const closeButton = dialog.querySelector<HTMLButtonElement>(
      '[aria-label="Close"]'
    )!;
    await act(async () => {
      await userEvent.click(closeButton);
      await new Promise(requestAnimationFrame);
    });

    expect(document.querySelector('[role="dialog"]')).toBe(dialog);
    expect(subject.value).toBe("Draft subject");
    expect(sender.value).toBe("invalid sender");
    expect($resources.get()).toEqual(
      new Map(mode === "existing" ? [[resource.id, resource]] : [])
    );
    expect($dataSources.get().size).toBe(mode === "existing" ? 1 : 0);

    await act(async () => userEvent.fill(sender, "Acme <acme@example.com>"));
    await act(async () => {
      await userEvent.click(closeButton);
      await new Promise(requestAnimationFrame);
    });
    await expect
      .poll(() => document.querySelector('[role="dialog"]'))
      .toBeNull();
    expect($resources.get().size).toBe(1);
    expect($dataSources.get().size).toBe(1);
    expect(Array.from($resources.get().values())[0].email).toMatchObject({
      sender: "Acme <acme@example.com>",
      subject: JSON.stringify("Draft subject"),
    });
  }
);
