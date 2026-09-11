import { act } from "react-dom/test-utils";
import { TooltipProvider } from "@webstudio-is/design-system";
import { afterEach, expect, test, vi } from "vitest";
import {
  createDefaultCollectionConfig,
  extractMarkdownFrontmatter,
  parseCollectionConfig,
} from "@webstudio-is/content-engine";
import type { Asset } from "@webstudio-is/sdk";
import { $assets } from "~/shared/sync/data-stores";
import { $authPermit } from "~/shared/nano-states";
import { CollectionEntrySettingsDialog } from "./collection-entry-settings-dialog";
import { createAssetManagerTestRenderer } from "./test-utils";

const renderer = createAssetManagerTestRenderer();
const asset: Asset = {
  id: "post",
  projectId: "project",
  name: "post.mdx",
  filename: "post",
  folderId: "posts",
  type: "file",
  format: "mdx",
  size: 1,
  meta: {},
  createdAt: "2026-09-08T00:00:00Z",
};
afterEach(() => {
  renderer.cleanup();
  $assets.set(new Map());
  $authPermit.set("own");
});

test("edits existing fields without losing the body or unknown properties, keeps slug immutable, and saves invalid fields", async () => {
  $assets.set(new Map([[asset.id, asset]]));
  $authPermit.set("own");
  const source =
    "---\ntitle: Old\nslug: post\nlegacy: Keep me\n---\n\n# Exact body\n\n<Unknown />\n";
  const updateContent = vi.fn(async () => ({ ...asset, name: "next.mdx" }));
  const onClose = vi.fn();
  renderer.render(
    <TooltipProvider>
      <CollectionEntrySettingsDialog
        asset={asset}
        collection={{
          status: "ready",
          folderId: "posts",
          configAsset: asset,
          templateAsset: asset,
          templateProperties: {},
          config: parseCollectionConfig(createDefaultCollectionConfig()),
        }}
        readSource={async () => source}
        updateContent={updateContent}
        onClose={onClose}
        onOpenFile={vi.fn()}
      />
    </TooltipProvider>
  );
  await vi.waitFor(() =>
    expect(
      document.querySelector<HTMLInputElement>("#collection-entry-title")?.value
    ).toBe("Old")
  );
  expect(document.querySelector("#collection-entry-slug")).toBeDisabled();
  const input = document.querySelector<HTMLInputElement>(
    "#collection-entry-title"
  )!;
  expect(document.activeElement).toBe(input);
  act(() => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )!.set!.call(input, "");
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  });
  await vi.waitFor(() => expect(updateContent).toHaveBeenCalledOnce());
  const call = updateContent.mock.calls[0] as unknown as [
    { asset: Asset; content: string },
  ];
  expect(call[0].asset.name).toBe(asset.name);
  expect(
    (await extractMarkdownFrontmatter(call[0].content)).properties
  ).toEqual({ title: "", slug: "post", legacy: "Keep me" });
  expect(call[0].content.endsWith("# Exact body\n\n<Unknown />\n")).toBe(true);
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(onClose).not.toHaveBeenCalled();
});

test("retains edits after a failed save and retries with the same expected revision", async () => {
  $assets.set(new Map([[asset.id, asset]]));
  $authPermit.set("own");
  const updateContent = vi.fn(
    async (_input: { asset: Asset; content: string }): Promise<Asset> => ({
      ...asset,
      name: "next.mdx",
    })
  );
  updateContent.mockRejectedValueOnce(
    new Error("The upload failed. Try again.")
  );
  renderer.render(
    <TooltipProvider>
      <CollectionEntrySettingsDialog
        asset={asset}
        collection={{
          status: "ready",
          folderId: "posts",
          configAsset: asset,
          templateAsset: asset,
          templateProperties: {},
          config: parseCollectionConfig(createDefaultCollectionConfig()),
        }}
        readSource={async () => "---\ntitle: Old\nslug: post\n---\nBody"}
        updateContent={updateContent}
        onClose={vi.fn()}
        onOpenFile={vi.fn()}
      />
    </TooltipProvider>
  );
  await vi.waitFor(() =>
    expect(
      document.querySelector<HTMLInputElement>("#collection-entry-title")?.value
    ).toBe("Old")
  );
  const input = document.querySelector<HTMLInputElement>(
    "#collection-entry-title"
  )!;
  act(() => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )!.set!.call(input, "New");
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  });
  await vi.waitFor(() =>
    expect(document.querySelector('[role="alert"]')).not.toBeNull()
  );
  expect(input.value).toBe("New");
  expect(updateContent).toHaveBeenCalledOnce();
  const retry = [...document.querySelectorAll("button")].find(
    (button) => button.textContent === "Retry save"
  )!;
  act(() => retry.click());
  await vi.waitFor(() => expect(updateContent).toHaveBeenCalledTimes(2));
  expect(updateContent.mock.calls.map(([input]) => input.asset.name)).toEqual([
    asset.name,
    asset.name,
  ]);
  expect(updateContent.mock.calls[0][0].content).toBe(
    updateContent.mock.calls[1][0].content
  );
});

test("keeps typing available during autosave and saves the newer draft against the returned revision", async () => {
  $assets.set(new Map([[asset.id, asset]]));
  $authPermit.set("own");
  const onClose = vi.fn();
  let finishFirstSave: (asset: Asset) => void = () => {};
  const firstSave = new Promise<Asset>((resolve) => {
    finishFirstSave = resolve;
  });
  const updateContent = vi.fn(
    async (_input: { asset: Asset; content: string }): Promise<Asset> => ({
      ...asset,
      name: "last.mdx",
    })
  );
  updateContent.mockReturnValueOnce(firstSave);
  renderer.render(
    <TooltipProvider>
      <CollectionEntrySettingsDialog
        asset={asset}
        collection={{
          status: "ready",
          folderId: "posts",
          configAsset: asset,
          templateAsset: asset,
          templateProperties: {},
          config: parseCollectionConfig(createDefaultCollectionConfig()),
        }}
        readSource={async () => "---\ntitle: Old\nslug: post\n---\nBody"}
        updateContent={updateContent}
        onClose={onClose}
        onOpenFile={vi.fn()}
      />
    </TooltipProvider>
  );
  await vi.waitFor(() =>
    expect(
      document.querySelector<HTMLInputElement>("#collection-entry-title")?.value
    ).toBe("Old")
  );
  const input = document.querySelector<HTMLInputElement>(
    "#collection-entry-title"
  )!;
  const type = (value: string) =>
    act(() => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )!.set!.call(input, value);
      input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
  type("First");
  await vi.waitFor(() => expect(updateContent).toHaveBeenCalledOnce());
  await vi.waitFor(() =>
    expect(document.querySelector('[role="status"]')).not.toBeNull()
  );
  expect(input).not.toBeDisabled();
  expect(document.activeElement).toBe(input);
  type("Old");
  await act(async () => {
    document.querySelector<HTMLButtonElement>('[aria-label="Close"]')!.click();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve())
    );
  });
  expect(onClose).not.toHaveBeenCalled();
  type("Second");
  await act(async () => finishFirstSave({ ...asset, name: "next.mdx" }));
  await vi.waitFor(() => expect(updateContent).toHaveBeenCalledTimes(2));
  expect(updateContent.mock.calls[1][0].asset.name).toBe("next.mdx");
  expect(
    (await extractMarkdownFrontmatter(updateContent.mock.calls[1][0].content))
      .properties.title
  ).toBe("Second");
});

test("identifies the entry in the title and opens its configured canvas page", async () => {
  $assets.set(new Map([[asset.id, asset]]));
  const onClose = vi.fn();
  const onOpenCanvas = vi.fn();
  renderer.render(
    <TooltipProvider>
      <CollectionEntrySettingsDialog
        asset={asset}
        collection={{
          status: "ready",
          folderId: "posts",
          configAsset: asset,
          templateAsset: asset,
          templateProperties: {},
          config: parseCollectionConfig(createDefaultCollectionConfig()),
        }}
        readSource={async () => "---\ntitle: Post\nslug: post\n---\nBody"}
        updateContent={vi.fn()}
        onClose={onClose}
        onOpenFile={vi.fn()}
        onOpenCanvas={onOpenCanvas}
      />
    </TooltipProvider>
  );
  await vi.waitFor(() =>
    expect(
      document.querySelector<HTMLInputElement>("#collection-entry-title")?.value
    ).toBe("Post")
  );
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
    "Entry settings — post.mdx"
  );
  const openOnCanvas = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === "Open on canvas"
  );
  expect(openOnCanvas).toBeDefined();
  await act(async () => {
    openOnCanvas?.click();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve())
    );
  });
  expect(onClose).toHaveBeenCalledOnce();
  expect(onOpenCanvas).toHaveBeenCalledOnce();
});

test("shows disabled canvas navigation when no entry page is configured", async () => {
  $assets.set(new Map([[asset.id, asset]]));
  renderer.render(
    <TooltipProvider>
      <CollectionEntrySettingsDialog
        asset={asset}
        collection={{
          status: "ready",
          folderId: "posts",
          configAsset: asset,
          templateAsset: asset,
          templateProperties: {},
          config: parseCollectionConfig(createDefaultCollectionConfig()),
        }}
        readSource={async () => "---\ntitle: Post\nslug: post\n---\nBody"}
        updateContent={vi.fn()}
        onClose={vi.fn()}
        onOpenFile={vi.fn()}
      />
    </TooltipProvider>
  );
  await vi.waitFor(() =>
    expect(
      document.querySelector<HTMLInputElement>("#collection-entry-title")?.value
    ).toBe("Post")
  );
  const openOnCanvas = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === "Open on canvas"
  );
  expect(openOnCanvas).toBeDefined();
  expect(openOnCanvas).toHaveAttribute("aria-disabled", "true");
  expect(openOnCanvas?.querySelector("svg")).not.toBeNull();
});
