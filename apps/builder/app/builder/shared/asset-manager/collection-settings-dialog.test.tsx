import { act } from "react-dom/test-utils";
import { useState, type ReactNode } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import {
  createDefaultCollectionConfig,
  createDefaultCollectionTemplate,
  parseCollectionConfig,
} from "@webstudio-is/content-engine";
import {
  assetContentDescriptorHeader,
  serializeAssetContentDescriptor,
} from "@webstudio-is/protocol/asset-resource-api";
import type { Asset } from "@webstudio-is/sdk";
import { __testing__ } from "~/shared/asset-content-bridge.client";
import { $assets, $pages, $project } from "~/shared/sync/data-stores";
import {
  CollectionSettingsDialog,
  getCollectionSettingsSaveOrder,
  updateCollectionConfigAndTemplateName,
} from "./collection-settings-dialog";
import { isCollectionPreviewPath } from "./collection-preview-utils";
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
  name: `${filename}-storage.${format}`,
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
const { initBridge, clearBridge } = __testing__;
const render = (children: ReactNode) =>
  renderer.render(<TooltipProvider>{children}</TooltipProvider>);

test("only accepts preview paths with the configured slug parameter", () => {
  expect(isCollectionPreviewPath("/blog/:slug", "slug")).toBe(true);
  expect(isCollectionPreviewPath("/:category/:slug", "slug")).toBe(false);
  expect(isCollectionPreviewPath("/:category?/:slug", "slug")).toBe(true);
  expect(isCollectionPreviewPath("/*/:slug", "slug")).toBe(true);
  expect(isCollectionPreviewPath("/blog/:post", "slug")).toBe(false);
  expect(isCollectionPreviewPath("/blog", "slug")).toBe(false);
});

test("does not commit collection settings after the active project changes", async () => {
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
  const collection = {
    status: "ready" as const,
    folderId: "posts",
    configAsset,
    templateAsset,
    config: parseCollectionConfig(createDefaultCollectionConfig()),
    templateProperties: { draft: true },
  };
  const request = vi.fn(async () => {
    $project.set({ id: "another-project" } as never);
    return Response.json({
      configAsset: { ...configAsset, name: "config-revision.json" },
      templateAsset: { ...templateAsset, filename: "post-template" },
    });
  });

  await expect(
    updateCollectionConfigAndTemplateName({
      projectId: "project",
      collection,
      templateFilename: "post-template",
      configSource: createDefaultCollectionConfig(),
      request,
    })
  ).rejects.toThrow("updated in the previous project");
});

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
  initBridge({
    authorize: () => true,
    requireReload: () => undefined,
    request: async () => {
      const template = "---\ndraft: true\n---\n\nStart writing.\n";
      const asset = createAsset({
        id: "template",
        filename: "template",
        format: "mdx",
      });
      return new Response(template, {
        headers: {
          "content-length": String(new TextEncoder().encode(template).length),
          [assetContentDescriptorHeader]:
            serializeAssetContentDescriptor(asset),
        },
      });
    },
  });
});

test("asks before discarding unsaved collection settings", async () => {
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
    <CollectionSettingsDialog
      collection={{
        status: "ready",
        folderId: "posts",
        configAsset,
        templateAsset,
        config: parseCollectionConfig(createDefaultCollectionConfig()),
        templateProperties: { draft: true },
      }}
      open
      onOpenChange={onOpenChange}
      readTemplateSource={async () =>
        "---\ndraft: true\n---\n\nStart writing.\n"
      }
    />
  );
  await act(async () => undefined);
  await vi.waitFor(() =>
    expect(
      Array.from(document.querySelectorAll("button")).find(
        (button) => button.textContent === "Save"
      )?.disabled
    ).toBe(false)
  );
  const templateName = document.querySelector<HTMLInputElement>(
    '[aria-label="Entry template name"]'
  );
  if (templateName === null) {
    throw new Error("Expected template name control");
  }
  input(templateName, "article-template");
  act(() => {
    Array.from(document.querySelectorAll("button"))
      .find((button) => button.textContent === "Cancel")
      ?.click();
  });

  expect(document.body.textContent).toContain("Discard changes?");
  expect(onOpenChange).not.toHaveBeenCalled();
  act(() => {
    Array.from(document.querySelectorAll("button"))
      .find((button) => button.textContent === "Discard changes")
      ?.click();
  });
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

test("asks before discarding non-template edits after the template fails to load", async () => {
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
    <CollectionSettingsDialog
      collection={{
        status: "ready",
        folderId: "posts",
        configAsset,
        templateAsset,
        config: parseCollectionConfig(createDefaultCollectionConfig()),
        templateProperties: { draft: true },
      }}
      open
      onOpenChange={onOpenChange}
      readTemplateSource={async () => {
        throw new Error("Template unavailable");
      }}
    />
  );
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain("Template unavailable")
  );

  const templateName = document.querySelector<HTMLInputElement>(
    '[aria-label="Entry template name"]'
  );
  if (templateName === null) {
    throw new Error("Expected template name control");
  }
  input(templateName, "article-template");
  act(() => {
    Array.from(document.querySelectorAll("button"))
      .find((button) => button.textContent === "Cancel")
      ?.click();
  });

  expect(document.body.textContent).toContain("Discard changes?");
  expect(onOpenChange).not.toHaveBeenCalled();
});

afterEach(() => {
  renderer.cleanup();
  clearBridge();
  $assets.set(new Map());
  $pages.set(undefined);
  $project.set(undefined);
});

test("keeps the slug source field type fixed but lets designers make it optional", async () => {
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
  render(
    <CollectionSettingsDialog
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
    />
  );

  await act(async () => undefined);

  const typeControl = document.querySelector<HTMLButtonElement>(
    '[aria-label="Title type"]'
  );
  expect(typeControl).not.toBeNull();
  expect(typeControl?.disabled).toBe(true);
  const requiredControl = document.querySelector<HTMLButtonElement>(
    '[aria-label="Title required"]'
  );
  expect(requiredControl).not.toBeNull();
  expect(requiredControl?.disabled).toBe(false);
  const titleKey = document.querySelector<HTMLInputElement>(
    '[aria-label="Title key"]'
  );
  expect(titleKey?.disabled).toBe(false);
  if (titleKey === null) {
    throw new Error("Expected title key control");
  }
  input(titleKey, "headline");
  act(() => {
    document
      .querySelector<HTMLButtonElement>('[aria-label="Edit URL slug"]')
      ?.click();
  });
  expect(
    document.querySelector<HTMLButtonElement>(
      '[aria-label="Generate slug from"]'
    )?.textContent
  ).toContain("headline");
  const slugKey = document.querySelector<HTMLInputElement>(
    '[aria-label="URL slug key"]'
  );
  if (slugKey === null) {
    throw new Error("Expected slug key control");
  }
  input(slugKey, "permalink");
  expect(
    document.querySelector<HTMLButtonElement>('[aria-label="URL slug type"]')
      ?.textContent
  ).toContain("Slug");
});

test("orders schema and template writes without creating an invalid collection", () => {
  const baseValue = JSON.parse(createDefaultCollectionConfig());
  const baseConfig = parseCollectionConfig(JSON.stringify(baseValue));

  const addedValue = structuredClone(baseValue);
  addedValue.properties.summary = { type: "string" };
  const addedConfig = parseCollectionConfig(JSON.stringify(addedValue));
  expect(
    getCollectionSettingsSaveOrder({
      currentConfig: baseConfig,
      currentTemplateProperties: { draft: true },
      nextConfig: addedConfig,
      nextTemplateProperties: { draft: true, summary: "Hello" },
    })
  ).toBe("config-first");

  expect(
    getCollectionSettingsSaveOrder({
      currentConfig: addedConfig,
      currentTemplateProperties: { draft: true, summary: "Hello" },
      nextConfig: baseConfig,
      nextTemplateProperties: { draft: true },
    })
  ).toBe("template-first");

  const oldTypedValue = structuredClone(baseValue);
  oldTypedValue.properties.rating = { type: "string" };
  const nextTypedValue = structuredClone(baseValue);
  nextTypedValue.properties.rating = { type: "number" };
  expect(
    getCollectionSettingsSaveOrder({
      currentConfig: parseCollectionConfig(JSON.stringify(oldTypedValue)),
      currentTemplateProperties: { draft: true, rating: "five" },
      nextConfig: parseCollectionConfig(JSON.stringify(nextTypedValue)),
      nextTemplateProperties: { draft: true, rating: 5 },
    })
  ).toBeUndefined();
});

test("does not enable saving when the entry template failed to load", async () => {
  initBridge({
    authorize: () => true,
    requireReload: () => undefined,
    request: async () => {
      throw new Error("Template unavailable");
    },
  });
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
  render(
    <CollectionSettingsDialog
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
    />
  );

  await act(async () => undefined);

  const save = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent === "Save");
  expect(document.body.textContent).toContain("Template unavailable");
  expect(save?.disabled).toBe(true);
});

test("closes while the entry template is loading and ignores the late result", async () => {
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
  let resolveTemplate: (source: string) => void = () => void 0;
  const readTemplateSource = vi.fn(
    () =>
      new Promise<string>((resolve) => {
        resolveTemplate = resolve;
      })
  );
  const Dialog = () => {
    const [open, setOpen] = useState(true);
    return (
      <CollectionSettingsDialog
        collection={{
          status: "ready",
          folderId: "posts",
          configAsset,
          templateAsset,
          config: parseCollectionConfig(createDefaultCollectionConfig()),
          templateProperties: { draft: true },
        }}
        open={open}
        onOpenChange={(nextOpen) => {
          onOpenChange(nextOpen);
          setOpen(nextOpen);
        }}
        readTemplateSource={readTemplateSource}
      />
    );
  };
  render(<Dialog />);

  await act(async () => {
    document.querySelector<HTMLButtonElement>('[aria-label="Close"]')?.click();
  });

  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(document.querySelector('[role="dialog"]')).toBeNull();

  await act(async () => resolveTemplate(createDefaultCollectionTemplate()));

  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

test("does not close while collection settings are saving", async () => {
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
  const updateContent = vi.fn(() => new Promise<Asset>(() => undefined));
  render(
    <CollectionSettingsDialog
      collection={{
        status: "ready",
        folderId: "posts",
        configAsset,
        templateAsset,
        config: parseCollectionConfig(createDefaultCollectionConfig()),
        templateProperties: { draft: true },
      }}
      open
      onOpenChange={onOpenChange}
      readTemplateSource={async () => createDefaultCollectionTemplate()}
      updateContent={updateContent}
    />
  );
  await act(async () => undefined);

  const save = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent === "Save");
  await act(async () => save?.click());
  await vi.waitFor(() => expect(updateContent).toHaveBeenCalledOnce());
  await act(async () => {
    document.querySelector<HTMLButtonElement>('[aria-label="Close"]')?.click();
  });

  expect(onOpenChange).not.toHaveBeenCalled();
});

test("keeps focus while editing a field key", async () => {
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
  };
  render(
    <CollectionSettingsDialog
      collection={{
        status: "ready",
        folderId: "posts",
        configAsset,
        templateAsset,
        config: parseCollectionConfig(JSON.stringify(configValue)),
        templateProperties: { draft: true },
      }}
      open
      onOpenChange={() => undefined}
    />
  );

  await act(async () => undefined);

  act(() => {
    document
      .querySelector<HTMLButtonElement>('[aria-label="Edit Summary"]')
      ?.click();
  });

  const keyControl = document.querySelector<HTMLInputElement>(
    '[aria-label="Summary key"]'
  );
  if (keyControl === null) {
    throw new Error("Expected Summary key control");
  }
  keyControl.focus();
  input(keyControl, "summaryText");

  expect(document.activeElement).toBe(keyControl);
});

test("organizes field, template, and collection settings by task", async () => {
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
  render(
    <CollectionSettingsDialog
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
    />
  );

  await act(async () => undefined);

  const titleField = document.querySelector<HTMLButtonElement>(
    '[aria-label="Edit Title"]'
  );
  expect(titleField?.getAttribute("aria-expanded")).toBe("true");
  expect(titleField?.textContent).toContain("title");
  expect(titleField?.textContent).toContain("Text");
  expect(titleField?.textContent).toContain("Required");
  act(() => {
    document
      .querySelector<HTMLButtonElement>('[aria-label="Edit URL slug"]')
      ?.click();
  });
  expect(
    document.querySelector('[aria-label="Generate slug from"]')
  ).toBeInstanceOf(HTMLButtonElement);
  expect(document.querySelector('[aria-label="URL slug type"]')).toBeInstanceOf(
    HTMLButtonElement
  );
  expect(
    document.querySelector('[role="toolbar"][aria-label="Markdown formatting"]')
  ).toBeInstanceOf(HTMLElement);
  expect(
    document
      .querySelector('[aria-label="Entry template Markdown"]')
      ?.classList.contains("cm-content")
  ).toBe(true);
  const templateName = document.querySelector<HTMLInputElement>(
    '[aria-label="Entry template name"]'
  );
  expect(templateName?.value).toBe("template");
  if (templateName === null) {
    throw new Error("Expected template name control");
  }
  input(templateName, "post-template");
  expect(templateName.value).toBe("post-template");
  expect(document.querySelector("#collection-entry-template")).toBeNull();
  expect(document.querySelector('[aria-label="Title default"]')).toBeNull();
  expect(document.querySelector('[aria-label="Draft default"]')).toBeNull();

  const settingsSection = Array.from(
    document.querySelectorAll<HTMLElement>('[role="option"]')
  ).find((option) => option.textContent === "Settings");
  expect(settingsSection).not.toBeUndefined();
  act(() => settingsSection?.click());
  expect(settingsSection?.getAttribute("aria-current")).toBe("true");
  expect(document.body.textContent).toContain("Entry preview");
});

test("persists a template rename with the collection config before saving template content", async () => {
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
  const order: string[] = [];
  const updateConfigAndTemplateName = vi.fn(async () => {
    order.push("config-and-name");
    return {
      configAsset: { ...configAsset, name: "config-revision.json" },
      templateAsset: { ...templateAsset, filename: "post-template" },
    };
  });
  const updateContent = vi.fn(async ({ asset }: { asset: Asset }) => {
    order.push("template-content");
    return { ...asset, name: "template-revision.mdx" };
  });
  const onOpenChange = vi.fn();
  render(
    <CollectionSettingsDialog
      collection={{
        status: "ready",
        folderId: "posts",
        configAsset,
        templateAsset,
        config: parseCollectionConfig(createDefaultCollectionConfig()),
        templateProperties: { draft: true },
      }}
      open
      onOpenChange={onOpenChange}
      readTemplateSource={async () =>
        "---\ndraft: true\n---\n\nStart writing.\n"
      }
      updateContent={updateContent}
      updateConfigAndTemplateName={updateConfigAndTemplateName}
    />
  );
  await act(async () => undefined);
  const templateName = document.querySelector<HTMLInputElement>(
    '[aria-label="Entry template name"]'
  );
  if (templateName === null) {
    throw new Error("Expected template name control");
  }
  input(templateName, "post-template");
  const save = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent === "Save");
  if (save === undefined) {
    throw new Error("Expected save control");
  }
  await vi.waitFor(() => expect(save.disabled).toBe(false));

  await act(async () => {
    save.click();
  });
  await vi.waitFor(() => expect(order).toHaveLength(2));

  expect(order).toEqual(["config-and-name", "template-content"]);
  expect(updateConfigAndTemplateName).toHaveBeenCalledWith(
    expect.objectContaining({
      templateFilename: "post-template",
      configSource: expect.stringContaining('"template": "post-template.mdx"'),
    })
  );
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

test("clears a preview that no longer matches a renamed slug field", async () => {
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
  configValue["x-webstudio"].previewPage = "/blog/:slug";
  $pages.set({
    homePageId: "home",
    rootFolderId: "root",
    pages: new Map([
      [
        "home",
        {
          id: "home",
          name: "Home",
          title: "Home",
          path: "",
          rootInstanceId: "home-root",
          meta: {},
        },
      ],
      [
        "blog",
        {
          id: "blog",
          name: "Blog post",
          title: "Blog post",
          path: "/blog/:slug",
          rootInstanceId: "blog-root",
          meta: {},
        },
      ],
    ]),
    folders: new Map([
      [
        "root",
        {
          id: "root",
          name: "Root",
          slug: "",
          children: ["home", "blog"],
        },
      ],
    ]),
  });
  render(
    <CollectionSettingsDialog
      collection={{
        status: "ready",
        folderId: "posts",
        configAsset,
        templateAsset,
        config: parseCollectionConfig(JSON.stringify(configValue)),
        templateProperties: { draft: true },
      }}
      open
      onOpenChange={() => undefined}
    />
  );

  await act(async () => undefined);
  expect(
    Array.from(document.querySelectorAll("button")).some(
      (button) => button.textContent === "Clear"
    )
  ).toBe(true);
  act(() => {
    document
      .querySelector<HTMLButtonElement>('[aria-label="Edit URL slug"]')
      ?.click();
  });
  const slugKey = document.querySelector<HTMLInputElement>(
    '[aria-label="URL slug key"]'
  );
  if (slugKey === null) {
    throw new Error("Expected slug key control");
  }
  input(slugKey, "permalink");
  await act(async () => undefined);

  expect(
    Array.from(document.querySelectorAll("button")).some(
      (button) => button.textContent === "Clear"
    )
  ).toBe(false);
});

test("does not reuse an original field key for a new row", async () => {
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
  configValue.properties.field1 = { title: "Field one", type: "string" };
  render(
    <CollectionSettingsDialog
      collection={{
        status: "ready",
        folderId: "posts",
        configAsset,
        templateAsset,
        config: parseCollectionConfig(JSON.stringify(configValue)),
        templateProperties: { draft: true },
      }}
      open
      onOpenChange={() => undefined}
    />
  );

  await act(async () => undefined);
  act(() => {
    document
      .querySelector<HTMLButtonElement>('[aria-label="Edit Field one"]')
      ?.click();
  });
  const key = document.querySelector<HTMLInputElement>(
    '[aria-label="Field one key"]'
  );
  if (key === null) {
    throw new Error("Expected Field one key control");
  }
  input(key, "summary");
  act(() => {
    Array.from(document.querySelectorAll("button"))
      .find((button) => button.textContent === "Add field")
      ?.click();
  });

  expect(
    document.querySelector<HTMLInputElement>('[aria-label="New field key"]')
      ?.value
  ).toBe("field2");
});

test("locks collection changes that require migrating existing entries", async () => {
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
  const entryAsset = createAsset({
    id: "entry",
    filename: "first-post",
    format: "mdx",
  });
  const configValue = JSON.parse(createDefaultCollectionConfig());
  configValue.properties.summary = { title: "Summary", type: "string" };
  $assets.set(new Map([[entryAsset.id, entryAsset]]));
  render(
    <CollectionSettingsDialog
      collection={{
        status: "ready",
        folderId: "posts",
        configAsset,
        templateAsset,
        config: parseCollectionConfig(JSON.stringify(configValue)),
        templateProperties: { draft: true },
      }}
      open
      onOpenChange={() => undefined}
    />
  );

  await act(async () => undefined);

  act(() => {
    document
      .querySelector<HTMLButtonElement>('[aria-label="Edit URL slug"]')
      ?.click();
  });
  expect(
    document.querySelector<HTMLButtonElement>('[aria-label="URL slug type"]')
      ?.disabled
  ).toBe(true);
  act(() => {
    document
      .querySelector<HTMLButtonElement>('[aria-label="Edit Summary"]')
      ?.click();
  });
  expect(
    document.querySelector<HTMLInputElement>('[aria-label="Summary key"]')
      ?.disabled
  ).toBe(true);
  expect(
    document.querySelector<HTMLButtonElement>('[aria-label="Summary type"]')
      ?.disabled
  ).toBe(true);
  expect(
    document.querySelector<HTMLButtonElement>('[aria-label="Remove Summary"]')
      ?.disabled
  ).toBe(true);
});
