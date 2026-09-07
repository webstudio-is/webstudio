import { act } from "react-dom/test-utils";
import type { ReactNode } from "react";
import { TooltipProvider } from "@webstudio-is/design-system";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  parseCollectionConfig,
  createDefaultCollectionConfig,
} from "@webstudio-is/content-engine";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { Asset } from "@webstudio-is/sdk";
import { $assets, $pages, $project } from "~/shared/sync/data-stores";
import { $selectedPageId } from "~/shared/nano-states";
import { CreateCollectionEntryDialog } from "./create-collection-entry-dialog";
import { createAssetManagerTestRenderer } from "./test-utils";

const createAsset = ({
  id,
  filename,
  format,
}: {
  id: string;
  filename: string;
  format: string;
}): Asset => ({
  id,
  projectId: "project",
  name: `${filename}.${format}`,
  filename,
  folderId: "posts",
  type: "file",
  format,
  size: 1,
  description: null,
  createdAt: "2026-09-02T00:00:00.000Z",
  meta: {},
});

const renderer = createAssetManagerTestRenderer();
const render = (children: ReactNode) =>
  renderer.render(<TooltipProvider>{children}</TooltipProvider>);

const input = (element: HTMLInputElement, value: string) => {
  act(() => {
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )?.set;
    valueSetter?.call(element, value);
    element.dispatchEvent(new InputEvent("input", { bubbles: true }));
  });
};

beforeEach(() => {
  $project.set({ id: "project" } as never);
  $assets.set(new Map());
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

afterEach(() => {
  renderer.cleanup();
  $assets.set(new Map());
  $pages.set(undefined);
  $project.set(undefined);
  $selectedPageId.set(undefined);
  vi.unstubAllGlobals();
});

test("does not navigate after creating an entry", async () => {
  const configAsset = createAsset({
    id: "config",
    filename: "collection",
    format: "json",
  });
  const templateAsset = createAsset({
    id: "template",
    filename: "template",
    format: "mdx",
  });
  const createdAsset = createAsset({
    id: "created",
    filename: "hello-world",
    format: "mdx",
  });
  const configValue = JSON.parse(createDefaultCollectionConfig());
  configValue["x-webstudio"].previewPage = "/blog/:slug";
  const pages = createDefaultPages({ rootInstanceId: "home-root" });
  pages.pages.set("blog", {
    id: "blog",
    name: "Blog post",
    title: "Blog post",
    path: "/blog/:slug",
    rootInstanceId: "blog-root",
    meta: {},
  });
  pages.folders.get(pages.rootFolderId)?.children.push("blog");
  $pages.set(pages);
  $selectedPageId.set(pages.homePageId);
  render(
    <CreateCollectionEntryDialog
      collection={{
        status: "ready",
        folderId: "posts",
        configAsset,
        templateAsset,
        config: parseCollectionConfig(JSON.stringify(configValue)),
        templateProperties: {},
      }}
      open
      onOpenChange={vi.fn()}
      createEntry={vi.fn().mockResolvedValue(createdAsset)}
    />
  );

  const title = document.querySelector<HTMLInputElement>(
    "#collection-entry-title"
  );
  if (title === null) {
    throw new Error("Expected collection entry title field");
  }
  input(title, "Hello world");
  const create = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent === "Create entry");
  await act(async () => create?.click());

  expect($selectedPageId.get()).toBe(pages.homePageId);
});

test("asks before closing a new entry with unsaved values", async () => {
  const configAsset = createAsset({
    id: "config",
    filename: "collection",
    format: "json",
  });
  const templateAsset = createAsset({
    id: "template",
    filename: "template",
    format: "mdx",
  });
  const onOpenChange = vi.fn();
  render(
    <CreateCollectionEntryDialog
      collection={{
        status: "ready",
        folderId: "posts",
        configAsset,
        templateAsset,
        config: parseCollectionConfig(createDefaultCollectionConfig()),
        templateProperties: {},
      }}
      open
      onOpenChange={onOpenChange}
    />
  );
  const title = document.querySelector<HTMLInputElement>(
    "#collection-entry-title"
  );
  if (title === null) {
    throw new Error("Expected title input");
  }
  input(title, "Unsaved title");

  await act(async () => {
    document.querySelector<HTMLButtonElement>('[aria-label="Close"]')?.click();
  });

  expect(document.body.textContent).toContain("Discard entry?");
  expect(onOpenChange).not.toHaveBeenCalled();
  expect(title.value).toBe("Unsaved title");
  const discard = Array.from(
    document.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent === "Discard entry");
  if (discard === undefined) {
    throw new Error("Expected discard entry button");
  }
  await act(async () => {
    discard.click();
  });

  expect(onOpenChange).toHaveBeenCalledWith(false);
});

test("validates entry fields before sending a create request", async () => {
  const configAsset = createAsset({
    id: "config",
    filename: "collection",
    format: "json",
  });
  const templateAsset = createAsset({
    id: "template",
    filename: "template",
    format: "mdx",
  });
  const onOpenChange = vi.fn();
  render(
    <CreateCollectionEntryDialog
      collection={{
        status: "ready",
        folderId: "posts",
        configAsset,
        templateAsset,
        config: parseCollectionConfig(createDefaultCollectionConfig()),
        templateProperties: {},
      }}
      open
      onOpenChange={onOpenChange}
    />
  );

  const create = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent === "Create entry");
  await act(async () => {
    create?.click();
  });

  expect(document.body.textContent).toContain(
    "Title must contain at least 1 character"
  );
  expect(document.querySelector("[role=alert]")?.textContent).toContain(
    "Title must contain at least 1 character"
  );
  expect(
    document.querySelector<HTMLInputElement>("#collection-entry-title")
  ).toHaveAttribute("aria-invalid", "true");
  const titleInput = document.querySelector<HTMLInputElement>(
    "#collection-entry-title"
  )!;
  const fieldError = document.getElementById(
    titleInput.getAttribute("aria-describedby")!
  );
  expect(titleInput.parentElement?.parentElement?.contains(fieldError)).toBe(
    true
  );
  expect(
    document.querySelector<HTMLInputElement>("#collection-entry-slug")
  ).not.toHaveAttribute("aria-invalid");
  expect(document.activeElement).toBe(
    document.querySelector<HTMLInputElement>("#collection-entry-title")
  );
  expect(
    document.querySelector<HTMLInputElement>("#collection-entry-title")
      ?.required
  ).toBe(true);
  expect(onOpenChange).not.toHaveBeenCalled();
});

test("submits an entry through the native form path used by Enter", async () => {
  const configAsset = createAsset({
    id: "config",
    filename: "collection",
    format: "json",
  });
  const templateAsset = createAsset({
    id: "template",
    filename: "template",
    format: "mdx",
  });
  const createEntry = vi.fn(async () => {
    throw new Error("Stop after capturing the request");
  });
  render(
    <CreateCollectionEntryDialog
      collection={{
        status: "ready",
        folderId: "posts",
        configAsset,
        templateAsset,
        config: parseCollectionConfig(createDefaultCollectionConfig()),
        templateProperties: { draft: false },
      }}
      open
      onOpenChange={vi.fn()}
      createEntry={createEntry}
    />
  );

  const title = document.querySelector<HTMLInputElement>(
    "#collection-entry-title"
  );
  const form = document.querySelector<HTMLFormElement>("form");
  if (title === null || form === null) {
    throw new Error("Expected collection entry form");
  }
  input(title, "Keyboard entry");

  await act(async () => {
    form.requestSubmit();
  });

  await vi.waitFor(() =>
    expect(createEntry).toHaveBeenCalledWith({
      folderId: "posts",
      projectId: "project",
      values: {
        draft: false,
        slug: "keyboard-entry",
        title: "Keyboard entry",
      },
    })
  );
});

test("regenerates a cleared slug before validating the entry", async () => {
  const configAsset = createAsset({
    id: "config",
    filename: "collection",
    format: "json",
  });
  const templateAsset = createAsset({
    id: "template",
    filename: "template",
    format: "mdx",
  });
  const createEntry = vi.fn(async () => {
    throw new Error("Stop after capturing the request");
  });
  render(
    <CreateCollectionEntryDialog
      collection={{
        status: "ready",
        folderId: "posts",
        configAsset,
        templateAsset,
        config: parseCollectionConfig(createDefaultCollectionConfig()),
        templateProperties: { draft: false },
      }}
      open
      onOpenChange={vi.fn()}
      createEntry={createEntry}
    />
  );

  const title = document.querySelector<HTMLInputElement>(
    "#collection-entry-title"
  );
  const slug = document.querySelector<HTMLInputElement>(
    "#collection-entry-slug"
  );
  if (title === null || slug === null) {
    throw new Error("Expected collection entry fields");
  }
  input(title, "Hello world");
  input(slug, "");
  const create = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent === "Create entry");
  await act(async () => {
    create?.click();
  });

  expect(createEntry).toHaveBeenCalledWith({
    folderId: "posts",
    projectId: "project",
    values: { draft: false, slug: "hello-world", title: "Hello world" },
  });
});

test("uses only the entry template for optional field defaults", async () => {
  const configAsset = createAsset({
    id: "config",
    filename: "collection",
    format: "json",
  });
  const templateAsset = createAsset({
    id: "template",
    filename: "template",
    format: "mdx",
  });
  const createEntry = vi.fn(async () => {
    throw new Error("Stop after capturing the request");
  });
  const configValue = JSON.parse(createDefaultCollectionConfig());
  configValue.properties.draft.default = true;
  render(
    <CreateCollectionEntryDialog
      collection={{
        status: "ready",
        folderId: "posts",
        configAsset,
        templateAsset,
        config: parseCollectionConfig(JSON.stringify(configValue)),
        templateProperties: {},
      }}
      open
      onOpenChange={vi.fn()}
      createEntry={createEntry}
    />
  );

  const title = document.querySelector<HTMLInputElement>(
    "#collection-entry-title"
  );
  if (title === null) {
    throw new Error("Expected collection entry title field");
  }
  input(title, "Hello world");
  const create = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent === "Create entry");
  await act(async () => {
    create?.click();
  });

  expect(createEntry).toHaveBeenCalledWith({
    folderId: "posts",
    projectId: "project",
    values: { slug: "hello-world", title: "Hello world" },
  });
});

test("explicitly clears a template-backed optional value", async () => {
  const configAsset = createAsset({
    id: "config",
    filename: "collection",
    format: "json",
  });
  const templateAsset = createAsset({
    id: "template",
    filename: "template",
    format: "mdx",
  });
  const configValue = JSON.parse(createDefaultCollectionConfig());
  configValue.properties.summary = {
    title: "Summary",
    type: "string",
    "x-webstudio": { control: "textarea" },
  };
  const createEntry = vi.fn(async () => {
    throw new Error("Stop after capturing the request");
  });
  render(
    <CreateCollectionEntryDialog
      collection={{
        status: "ready",
        folderId: "posts",
        configAsset,
        templateAsset,
        config: parseCollectionConfig(JSON.stringify(configValue)),
        templateProperties: { summary: "Template summary" },
      }}
      open
      onOpenChange={vi.fn()}
      createEntry={createEntry}
    />
  );

  const title = document.querySelector<HTMLInputElement>(
    "#collection-entry-title"
  );
  const summary = document.querySelector<HTMLTextAreaElement>(
    "#collection-entry-summary"
  );
  if (title === null || summary === null) {
    throw new Error("Expected collection entry fields");
  }
  input(title, "Hello world");
  const summaryActions = document.querySelector<HTMLButtonElement>(
    '[aria-label="Summary actions"]'
  );
  if (summaryActions === null) {
    throw new Error("Expected summary actions");
  }
  expect(summaryActions.type).toBe("button");
  await act(async () => {
    summaryActions.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true, button: 0 })
    );
  });
  const clear = Array.from(
    document.querySelectorAll<HTMLElement>('[role="menuitem"]')
  ).find((item) => item.textContent === "Clear value");
  expect(clear).toBeDefined();
  await act(async () => clear?.click());
  expect(createEntry).not.toHaveBeenCalled();
  const create = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent === "Create entry");
  await act(async () => {
    create?.click();
  });

  expect(createEntry).toHaveBeenCalledWith({
    folderId: "posts",
    projectId: "project",
    values: {
      slug: "hello-world",
      summary: null,
      title: "Hello world",
    },
  });
  expect(createEntry).toHaveBeenCalledOnce();
});

test("preserves an explicit blank optional string", async () => {
  const configAsset = createAsset({
    id: "config",
    filename: "collection",
    format: "json",
  });
  const templateAsset = createAsset({
    id: "template",
    filename: "template",
    format: "mdx",
  });
  const configValue = JSON.parse(createDefaultCollectionConfig());
  configValue.properties.summary = {
    title: "Summary",
    type: "string",
    maxLength: 1,
  };
  const createEntry = vi.fn(async () => {
    throw new Error("Stop after capturing the request");
  });
  render(
    <CreateCollectionEntryDialog
      collection={{
        status: "ready",
        folderId: "posts",
        configAsset,
        templateAsset,
        config: parseCollectionConfig(JSON.stringify(configValue)),
        templateProperties: { summary: "Template summary" },
      }}
      open
      onOpenChange={vi.fn()}
      createEntry={createEntry}
    />
  );

  const title = document.querySelector<HTMLInputElement>(
    "#collection-entry-title"
  );
  const summary = document.querySelector<HTMLInputElement>(
    "#collection-entry-summary"
  );
  if (title === null || summary === null) {
    throw new Error("Expected collection entry fields");
  }
  expect(summary.maxLength).toBe(-1);
  input(title, "Hello world");
  input(summary, "");
  const create = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent === "Create entry");
  await act(async () => {
    create?.click();
  });

  expect(createEntry).toHaveBeenCalledWith({
    folderId: "posts",
    projectId: "project",
    values: {
      slug: "hello-world",
      summary: "",
      title: "Hello world",
    },
  });
});

test("preserves all three optional boolean states in compact controls", async () => {
  const configAsset = createAsset({
    id: "config",
    filename: "collection",
    format: "json",
  });
  const templateAsset = createAsset({
    id: "template",
    filename: "template",
    format: "mdx",
  });
  const createEntry = vi.fn(async () => {
    throw new Error("Request captured");
  });
  render(
    <CreateCollectionEntryDialog
      collection={{
        status: "ready",
        folderId: "posts",
        configAsset,
        templateAsset,
        config: parseCollectionConfig(createDefaultCollectionConfig()),
        templateProperties: { draft: true },
      }}
      open
      onOpenChange={() => undefined}
      createEntry={createEntry}
    />
  );
  input(
    document.querySelector<HTMLInputElement>("#collection-entry-title")!,
    "Hello"
  );
  const group = document.querySelector('[aria-label="Draft"]')!;
  for (const [label, expected] of [
    ["No", false],
    ["Not set", null],
    ["Yes", true],
  ] as const) {
    const choice = Array.from(
      group.querySelectorAll<HTMLButtonElement>("button")
    ).find((button) => button.textContent === label)!;
    expect(choice).toBeDefined();
    await act(async () => choice.click());
    expect(choice.getAttribute("aria-checked")).toBe("true");
    await act(async () =>
      document.querySelector<HTMLFormElement>("form")!.requestSubmit()
    );
    expect(createEntry).toHaveBeenLastCalledWith({
      projectId: "project",
      folderId: "posts",
      values: { title: "Hello", slug: "hello", draft: expected },
    });
  }
});

test("scrolls long forms without squeezing fields or hiding the create action", async () => {
  const configAsset = createAsset({
    id: "config",
    filename: "collection",
    format: "json",
  });
  const templateAsset = createAsset({
    id: "template",
    filename: "template",
    format: "mdx",
  });
  const configValue = JSON.parse(createDefaultCollectionConfig());
  for (let index = 0; index < 12; index += 1) {
    configValue.properties[`extra${index}`] = {
      title: `Extra ${index}`,
      type: "string",
    };
  }
  render(
    <CreateCollectionEntryDialog
      collection={{
        status: "ready",
        folderId: "posts",
        configAsset,
        templateAsset,
        config: parseCollectionConfig(JSON.stringify(configValue)),
        templateProperties: {},
      }}
      open
      onOpenChange={() => undefined}
    />
  );
  await act(async () => undefined);
  const form = document.querySelector("form")!;
  const fields = form.firstElementChild as HTMLElement;
  const create = form.querySelector<HTMLButtonElement>(
    'button[type="submit"]'
  )!;
  expect(fields.scrollHeight).toBeGreaterThan(fields.clientHeight);
  const before = create.getBoundingClientRect();
  fields.scrollTop = fields.scrollHeight;
  expect(create.getBoundingClientRect().top).toBe(before.top);
  expect(before.bottom).toBeLessThanOrEqual(window.innerHeight - 16);
  const firstInput = document.querySelector("#collection-entry-title")!;
  expect(firstInput.getBoundingClientRect().height).toBeGreaterThanOrEqual(20);
});

test("does not commit an entry after the active project changes", async () => {
  const configAsset = createAsset({
    id: "config",
    filename: "collection",
    format: "json",
  });
  const templateAsset = createAsset({
    id: "template",
    filename: "template",
    format: "mdx",
  });
  const createdAsset = createAsset({
    id: "created",
    filename: "hello-world",
    format: "mdx",
  });
  const createEntry = vi.fn(async () => {
    $project.set({ id: "another-project" } as never);
    return createdAsset;
  });
  const onOpenChange = vi.fn();
  render(
    <CreateCollectionEntryDialog
      collection={{
        status: "ready",
        folderId: "posts",
        configAsset,
        templateAsset,
        config: parseCollectionConfig(createDefaultCollectionConfig()),
        templateProperties: {},
      }}
      open
      onOpenChange={onOpenChange}
      createEntry={createEntry}
    />
  );

  const title = document.querySelector<HTMLInputElement>(
    "#collection-entry-title"
  );
  if (title === null) {
    throw new Error("Expected collection entry title field");
  }
  input(title, "Hello world");
  const create = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent === "Create entry");
  await act(async () => {
    create?.click();
  });

  expect(document.body.textContent).toContain(
    "The entry was created in the previous project. Return to that project to view it."
  );
  expect(onOpenChange).not.toHaveBeenCalled();
});

test("reconciles an idempotent retry when the entry is already loaded", async () => {
  const configAsset = createAsset({
    id: "config",
    filename: "collection",
    format: "json",
  });
  const templateAsset = createAsset({
    id: "template",
    filename: "template",
    format: "mdx",
  });
  const createdAsset = createAsset({
    id: "created",
    filename: "hello-world",
    format: "mdx",
  });
  $assets.set(new Map([[createdAsset.id, createdAsset]]));
  const onOpenChange = vi.fn();
  render(
    <CreateCollectionEntryDialog
      collection={{
        status: "ready",
        folderId: "posts",
        configAsset,
        templateAsset,
        config: parseCollectionConfig(createDefaultCollectionConfig()),
        templateProperties: {},
      }}
      open
      onOpenChange={onOpenChange}
      createEntry={vi.fn().mockResolvedValue(createdAsset)}
    />
  );

  const title = document.querySelector<HTMLInputElement>(
    "#collection-entry-title"
  );
  if (title === null) {
    throw new Error("Expected collection entry title field");
  }
  input(title, "Hello world");
  const create = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent === "Create entry");
  await act(async () => {
    create?.click();
  });

  expect(document.body.textContent).not.toContain("Asset already exists");
  expect(document.body.textContent).not.toContain("Discard entry?");
  expect(onOpenChange).toHaveBeenCalledWith(false);
});
