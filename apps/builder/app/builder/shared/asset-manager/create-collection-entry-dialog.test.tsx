import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  parseCollectionConfig,
  createDefaultCollectionConfig,
} from "@webstudio-is/content-engine";
import type { Asset } from "@webstudio-is/sdk";
import { $project } from "~/shared/sync/data-stores";
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
  $project.set(undefined);
  vi.unstubAllGlobals();
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
  renderer.render(
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
  expect(onOpenChange).not.toHaveBeenCalled();
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
  renderer.render(
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
  renderer.render(
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
