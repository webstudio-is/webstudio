import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { userEvent } from "@vitest/browser/context";
import { afterEach, expect, test, vi } from "vitest";
import { parseStaticStringExpression } from "@webstudio-is/expression";
import {
  assetsResourceUrl,
  sitemapResourceUrl,
} from "@webstudio-is/sdk/runtime";
import type { DataSource, Resource } from "@webstudio-is/sdk";
import { createDefaultPages } from "@webstudio-is/project-build";
import { TooltipProvider } from "@webstudio-is/design-system";
import {
  $dataSources,
  $instances,
  $pages,
  $props,
  $resources,
} from "~/shared/sync/data-stores";
import { $selectedPageId, selectInstance } from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync/sync-stores";
import { __testing__ } from "./variable-popover";
import { VariablePopoverTrigger } from "./variable-popover";
import { JsonForm } from "./variable-editors/json-editor";

import { SystemResourceForm } from "./variable-editors/system-resource-editor";

const { TypeField } = __testing__;
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
const initialResources = $resources.get();
const initialDataSources = $dataSources.get();
const initialInstances = $instances.get();
const initialPages = $pages.get();
const initialProps = $props.get();
registerContainers();

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  $resources.set(initialResources);
  $dataSources.set(initialDataSources);
  $instances.set(initialInstances);
  $pages.set(initialPages);
  $props.set(initialProps);
  selectInstance(undefined);
  $selectedPageId.set(undefined);
  document.body.innerHTML = "";
});

test("System resource types are listed directly in Type", async () => {
  const container = document.createElement("div");
  container.style.width = "280px";
  document.body.appendChild(container);
  root = createRoot(container);
  const onChange = vi.fn();
  await act(async () =>
    root?.render(
      <>
        <TypeField value="sitemap-resource" onChange={onChange} />
        <SystemResourceForm resourceType="sitemap-resource" />
      </>
    )
  );

  const selects = container.querySelectorAll<HTMLButtonElement>("button");
  expect(selects).toHaveLength(1);
  expect(selects[0].textContent).toContain("Sitemap");

  await act(async () => await userEvent.click(selects[0]));
  expect(
    document
      .querySelector<HTMLElement>("[data-radix-popper-content-wrapper]")
      ?.getBoundingClientRect().width
  ).toBe(selects[0].getBoundingClientRect().width);
  const topLevelOptions = Array.from(
    document.querySelectorAll<HTMLElement>('[role="option"]')
  ).map((option) => option.textContent?.replace(/Pro$/, "").trim());
  expect(topLevelOptions).toContain("Sitemap");
  expect(topLevelOptions).toContain("Current date");
  expect(topLevelOptions).toContain("Assets");
  expect(topLevelOptions).toContain("Email");
  expect(topLevelOptions).not.toContain("System resource");
  await act(
    async () =>
      await userEvent.click(
        Array.from(
          document.querySelectorAll<HTMLElement>('[role="option"]')
        ).find((option) => option.textContent?.startsWith("Email"))!
      )
  );
  expect(onChange).toHaveBeenCalledWith("email-resource");
  expect(container.querySelectorAll('input[name="url"]')).toHaveLength(1);
});

test.each([
  ["resource", "A REST resource is a configuration for secure data fetching."],
  [
    "graphql-resource",
    "A GraphQL resource is a configuration for secure data fetching with GraphQL.",
  ],
] as const)(
  "%s Resource type description preserves its approved wording",
  async (value, copy) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(<TypeField value={value} onChange={vi.fn()} />)
    );

    const typeSelect =
      container.querySelector<HTMLButtonElement>('[role="combobox"]');
    expect(typeSelect).not.toBeNull();
    await act(async () => await userEvent.click(typeSelect!));

    const description = document.querySelector<HTMLElement>(
      '[data-select-description="content"]'
    );
    expect(description?.textContent).toContain(copy);
    expect(description?.textContent).toContain(
      "You can safely use secrets in any field."
    );
  }
);

test("Email Resource type displays its approved description", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(<TypeField value="email-resource" onChange={vi.fn()} />)
  );

  const typeSelect =
    container.querySelector<HTMLButtonElement>('[role="combobox"]');
  expect(typeSelect).not.toBeNull();
  await act(async () => await userEvent.click(typeSelect!));

  const description = document.querySelector<HTMLElement>(
    '[data-select-description="content"]'
  );
  expect(description?.textContent).toContain(
    "Send a plain-text email through Webstudio Cloud when a Form is submitted."
  );
});

test("editing a System Resource and changing its Type persists the selected category", async () => {
  const resource: Resource = {
    id: "existing-resource",
    name: "Existing resource",
    control: "system",
    method: "get",
    url: JSON.stringify(sitemapResourceUrl),
    headers: [],
  };
  const variable: DataSource = {
    id: "existing-variable",
    type: "resource",
    name: "Existing resource",
    scopeInstanceId: "body",
    resourceId: resource.id,
  };
  $resources.set(new Map([[resource.id, resource]]));
  $dataSources.set(new Map([[variable.id, variable]]));
  $pages.set(createDefaultPages({ rootInstanceId: "body" }));
  $instances.set(
    new Map([
      [
        "body",
        { type: "instance", id: "body", component: "Body", children: [] },
      ],
    ])
  );
  $props.set(new Map());

  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  $selectedPageId.set("home");
  selectInstance(["body"]);
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <VariablePopoverTrigger variable={variable}>
          <button type="button">Open</button>
        </VariablePopoverTrigger>
      </TooltipProvider>
    )
  );
  await act(async () => userEvent.click(container.querySelector("button")!));
  const editor = await vi.waitFor(() => {
    const current = document.querySelector<HTMLElement>(
      "[data-variable-editor-dialog]"
    );
    expect(current).not.toBeNull();
    return current!;
  });

  const typeSelect = Array.from(
    editor.querySelectorAll<HTMLButtonElement>('[role="combobox"]')
  ).find((element) => element.textContent?.includes("Sitemap"));
  expect(typeSelect).toBeDefined();
  await act(async () => userEvent.click(typeSelect!));
  await act(async () =>
    userEvent.click(
      Array.from(
        document.querySelectorAll<HTMLElement>('[role="option"]')
      ).find((option) => option.textContent?.startsWith("Email"))!
    )
  );

  const form = editor.querySelector("form")!;
  const savedFormData = new FormData(form);
  expect(savedFormData.get("method")).toBe("post");
  expect(savedFormData.get("url")).toBe('""');
  expect(savedFormData.get("email-settings")).toBeTruthy();
  await act(async () => form.requestSubmit());
  expect($resources.get().get(resource.id)).toMatchObject({
    control: "email",
    method: "post",
    url: '""',
    email: {},
  });
  expect($dataSources.get().get(variable.id)?.type).toBe("resource");
});

test("reopening and saving an Assets Resource with a single-quoted URL keeps its type", async () => {
  const resource: Resource = {
    id: "assets-resource",
    name: "Assets",
    control: "system",
    method: "post",
    url: "'/$resources/assets'",
    headers: [],
  };
  const variable: DataSource = {
    id: "assets-variable",
    type: "resource",
    name: "Assets",
    scopeInstanceId: "body",
    resourceId: resource.id,
  };
  $resources.set(new Map([[resource.id, resource]]));
  $dataSources.set(new Map([[variable.id, variable]]));
  $pages.set(createDefaultPages({ rootInstanceId: "body" }));
  $instances.set(
    new Map([
      [
        "body",
        { type: "instance", id: "body", component: "Body", children: [] },
      ],
    ])
  );
  $props.set(new Map());
  $selectedPageId.set("home");
  selectInstance(["body"]);

  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <VariablePopoverTrigger variable={variable}>
          <button type="button">Open</button>
        </VariablePopoverTrigger>
      </TooltipProvider>
    )
  );
  await act(async () => userEvent.click(container.querySelector("button")!));
  await act(async () => new Promise((resolve) => setTimeout(resolve, 50)));

  const editor = document.querySelector<HTMLElement>(
    "[data-variable-editor-dialog]"
  );
  expect(editor).not.toBeNull();
  expect(
    parseStaticStringExpression(
      editor?.querySelector<HTMLInputElement>('input[name="url"]')?.value ?? ""
    )
  ).toBe(assetsResourceUrl);

  const form = editor?.querySelector("form");
  expect(form).not.toBeNull();
  await act(async () => form?.requestSubmit());

  expect(
    parseStaticStringExpression($resources.get().get(resource.id)?.url ?? "")
  ).toBe(assetsResourceUrl);
  expect($resources.get().get(resource.id)?.method).toBe("post");
});

test("Edit variable JSON value editor shows line numbers", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <JsonForm
        variable={undefined}
        value={'{\n  "name": "Acme"\n}'}
        onChange={() => {}}
      />
    )
  );

  expect(container.querySelector(".cm-lineNumbers")).not.toBeNull();
  const maximizeButton = container.querySelector<HTMLButtonElement>("button");
  expect(maximizeButton).not.toBeNull();
  await act(async () => await userEvent.hover(maximizeButton!.parentElement!));
  await act(async () => await userEvent.click(maximizeButton!));
  await act(async () => await new Promise(requestAnimationFrame));
  expect(maximizeButton!.getAttribute("aria-expanded")).toBe("true");
  expect(document.querySelectorAll(".cm-lineNumbers").length).toBeGreaterThan(
    1
  );
});
