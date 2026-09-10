import { act } from "react-dom/test-utils";
import { userEvent } from "@vitest/browser/context";
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
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  __testing__,
  createAssetContentBridge,
} from "~/shared/asset-content-bridge.client";
import { $assets, $pages, $project } from "~/shared/sync/data-stores";
import {
  CollectionSettingsDialog,
  updateCollectionConfigAndTemplateName,
} from "./collection-settings-dialog";
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

test("marks the limit input rather than placing its error in the Fields heading", async () => {
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
      open
      onOpenChange={vi.fn()}
      collection={{
        status: "ready",
        folderId: "posts",
        configAsset,
        templateAsset,
        config: parseCollectionConfig(createDefaultCollectionConfig()),
        templateProperties: { draft: true },
      }}
    />
  );
  const maximum = document.querySelector<HTMLInputElement>(
    '[aria-label="Title maximum length"]'
  )!;
  await vi.waitFor(() => expect(maximum.disabled).toBe(false));
  input(maximum, "0");
  expect(maximum.getAttribute("aria-invalid")).toBe("true");
  expect(
    document
      .querySelector('[aria-label="Title minimum length"]')
      ?.getAttribute("aria-invalid")
  ).not.toBe("true");
  expect(document.querySelector('[role="alert"]')).toBeNull();
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
  initBridge(
    createAssetContentBridge({
      origin: window.location.origin,
      authorize: () => true,
      requireReload: () => undefined,
      request: async () => {
        const template = "---\ndraft: true\n---\n\nStart writing.\n";
        const asset = createAsset({
          id: "template",
          filename: "template",
          format: "mdx",
        });
        asset.size = new TextEncoder().encode(template).length;
        return new Response(template, {
          headers: {
            "content-length": String(new TextEncoder().encode(template).length),
            [assetContentDescriptorHeader]:
              serializeAssetContentDescriptor(asset),
          },
        });
      },
    })
  );
});

test("asks before discarding invalid collection settings", async () => {
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
  const templateName = document.querySelector<HTMLInputElement>(
    '[aria-label="Entry template name"]'
  );
  if (templateName === null) {
    throw new Error("Expected template name control");
  }
  input(templateName, "");
  await act(async () => {
    document.querySelector<HTMLButtonElement>('[aria-label="Close"]')?.click();
  });

  await vi.waitFor(() =>
    expect(document.body.textContent).toContain("Discard changes?")
  );
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
  await act(async () => {
    document.querySelector<HTMLButtonElement>('[aria-label="Close"]')?.click();
  });

  await vi.waitFor(() =>
    expect(document.body.textContent).toContain("Discard changes?")
  );
  expect(onOpenChange).not.toHaveBeenCalled();
});

afterEach(() => {
  renderer.cleanup();
  clearBridge();
  $assets.set(new Map());
  $project.set(undefined);
  $pages.set(undefined);
});

test("allows text type edits for the slug source while protecting the slug", async () => {
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
  expect(typeControl?.disabled).toBe(false);
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

test("saves a collection without a slug after changing the slug type", async () => {
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
  const updateContent = vi.fn(
    async ({ asset }: { asset: Asset; content: string }) => asset
  );
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
      readTemplateSource={async () => createDefaultCollectionTemplate()}
      updateContent={updateContent}
    />
  );
  await act(async () => undefined);
  act(() =>
    document
      .querySelector<HTMLButtonElement>('[aria-label="Edit URL slug"]')
      ?.click()
  );
  const chooseType = async (value: string) => {
    const control = document.querySelector<HTMLButtonElement>(
      '[aria-label="URL slug type"]'
    )!;
    expect(control.disabled).toBe(false);
    await act(async () => userEvent.click(control));
    const option = Array.from(
      document.querySelectorAll<HTMLElement>('[role="option"]')
    ).find((option) => option.textContent === value)!;
    expect(option).toBeDefined();
    await act(async () => userEvent.click(option));
  };
  await chooseType("Text");
  expect(
    document.querySelector('[aria-label="URL slug type"]')?.textContent
  ).toBe("Text");
  expect(
    document.querySelector('[aria-label="Generate slug from"]')
  ).toBeNull();
  await vi.waitFor(() => expect(updateContent).toHaveBeenCalledOnce());
  const withoutSlug = parseCollectionConfig(
    updateContent.mock.calls[0][0].content
  );
  expect(withoutSlug.slugField).toBeUndefined();
  expect(withoutSlug.generateSlugFrom).toBeUndefined();
  expect(
    withoutSlug.fields.find((field) => field.key === "slug")?.control
  ).toBe("text");
  expect(document.querySelector('[role="alert"]')).toBeNull();
  await chooseType("Slug");
  input(
    document.querySelector<HTMLInputElement>('[aria-label="URL slug label"]')!,
    "Permalink"
  );
  await vi.waitFor(() => expect(updateContent).toHaveBeenCalledTimes(2));
  await vi.waitFor(() =>
    expect(document.querySelector('[role="alert"]')).toBeNull()
  );
  const saved = parseCollectionConfig(updateContent.mock.calls[1][0].content);
  expect(
    saved.fields.find((field) => field.key === saved.slugField)
  ).toMatchObject({ control: "slug", label: "Permalink" });
});

test("shows template loading failures without save or cancel buttons", async () => {
  initBridge(
    createAssetContentBridge({
      origin: window.location.origin,
      authorize: () => true,
      requireReload: () => undefined,
      request: async () => {
        throw new Error("Template unavailable");
      },
    })
  );
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

  const buttons = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  ).map((button) => button.textContent);
  expect(document.body.textContent).toContain("Template unavailable");
  expect(buttons).not.toContain("Save");
  expect(buttons).not.toContain("Cancel");
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
  act(() => {
    document.querySelector<HTMLButtonElement>('[aria-label="Bold"]')?.click();
  });

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

test("switches between field, template, and entry page settings", async () => {
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

  const sections = Array.from(
    document.querySelectorAll<HTMLElement>(
      '[role="listbox"]:not([aria-label="Collection fields"]) [role="option"]'
    )
  );
  expect(sections).toHaveLength(3);
  expect(sections[0]?.getAttribute("aria-current")).toBe("true");
  act(() => sections[1]?.click());
  expect(sections[0]?.hasAttribute("aria-current")).toBe(false);
  expect(sections[1]?.getAttribute("aria-current")).toBe("true");
  expect(
    document.querySelector('[role="toolbar"][aria-label="Markdown formatting"]')
  ).toBeInstanceOf(HTMLElement);
  expect(document.querySelector('[aria-label="Show preview"]')).toBeInstanceOf(
    HTMLButtonElement
  );
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
  act(() => sections[2]?.click());
  expect(document.querySelector('[aria-label="Entry page"]')).toBeInstanceOf(
    HTMLButtonElement
  );
});

test("saves the page used to open entries on the canvas", async () => {
  const pages = createDefaultPages({ rootInstanceId: "root" });
  pages.pages.set("article", {
    id: "article",
    name: "Article",
    path: "/blog/:slug",
    title: "Article",
    rootInstanceId: "article-root",
    meta: {},
  });
  pages.folders.get(pages.rootFolderId)?.children.push("article");
  $pages.set(pages);
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
  const updateContent = vi.fn(
    async ({ asset }: { asset: Asset; content: string }) => asset
  );
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
      readTemplateSource={async () => createDefaultCollectionTemplate()}
      updateContent={updateContent}
    />
  );
  await act(async () => undefined);
  const sections = Array.from(
    document.querySelectorAll<HTMLElement>(
      '[role="listbox"]:not([aria-label="Collection fields"]) [role="option"]'
    )
  );
  act(() => sections[2]?.click());
  const pageControl = document.querySelector<HTMLButtonElement>(
    '[aria-label="Entry page"]'
  )!;
  await act(async () => userEvent.click(pageControl));
  const article = Array.from(
    document.querySelectorAll<HTMLElement>('[role="option"]')
  ).find((option) => option.textContent?.startsWith("Article · /blog/:slug"));
  expect(article).toBeDefined();
  await act(async () => userEvent.click(article!));
  await vi.waitFor(() => expect(updateContent).toHaveBeenCalledOnce());
  expect(
    parseCollectionConfig(updateContent.mock.calls[0][0].content).entryPageId
  ).toBe("article");
});

test("persists a template rename without rewriting unchanged template content", async () => {
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
  await vi.waitFor(() => expect(order).toHaveLength(1));

  expect(order).toEqual(["config-and-name"]);
  expect(updateContent).not.toHaveBeenCalled();
  expect(updateConfigAndTemplateName).toHaveBeenCalledWith(
    expect.objectContaining({
      templateFilename: "post-template",
      configSource: expect.stringContaining('"template": "post-template.mdx"'),
    })
  );
  expect(onOpenChange).not.toHaveBeenCalled();
});

test("retries settings after template content was already saved", async () => {
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
  const updatedTemplateAsset = {
    ...templateAsset,
    name: "template-revision.mdx",
  };
  const updateContent = vi.fn(async ({ asset }: { asset: Asset }) => {
    expect(asset).toBe(templateAsset);
    return updatedTemplateAsset;
  });
  const updateConfigAndTemplateName = vi
    .fn()
    .mockRejectedValueOnce(new Error("Temporary failure"))
    .mockResolvedValueOnce({
      configAsset: { ...configAsset, name: "config-revision.json" },
      templateAsset: { ...updatedTemplateAsset, filename: "post-template" },
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
      readTemplateSource={async () => createDefaultCollectionTemplate()}
      updateContent={updateContent}
      updateConfigAndTemplateName={updateConfigAndTemplateName}
    />
  );
  await act(async () => undefined);

  act(() => {
    document.querySelector<HTMLButtonElement>('[aria-label="Bold"]')?.click();
  });
  const templateName = document.querySelector<HTMLInputElement>(
    '[aria-label="Entry template name"]'
  );
  if (templateName === null) {
    throw new Error("Expected template name control");
  }
  input(templateName, "post-template");
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain("Temporary failure")
  );
  await act(async () => {
    document.querySelector<HTMLButtonElement>('[aria-label="Close"]')?.click();
  });
  await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));

  expect(updateContent).toHaveBeenCalledOnce();
  expect(updateConfigAndTemplateName).toHaveBeenLastCalledWith(
    expect.objectContaining({
      collection: expect.objectContaining({
        templateAsset: updatedTemplateAsset,
      }),
    })
  );
});

test("preserves edits and stops writes after an unconfirmed save", async () => {
  const failure = Object.assign(new Error("Internal recovery instructions"), {
    code: "ASSET_UPDATE_COMMIT_UNCERTAIN",
  });
  const updateContent = vi.fn(async () => {
    throw failure;
  });
  const onOpenChange = vi.fn();
  render(
    <CollectionSettingsDialog
      collection={{
        status: "ready",
        folderId: "posts",
        configAsset: createAsset({
          id: "config",
          filename: "collection",
          format: "json",
        }),
        templateAsset: createAsset({
          id: "template",
          filename: "template",
          format: "mdx",
        }),
        config: parseCollectionConfig(createDefaultCollectionConfig()),
        templateProperties: { draft: true },
      }}
      open
      onOpenChange={onOpenChange}
      updateContent={updateContent}
      readTemplateSource={async () => createDefaultCollectionTemplate()}
    />
  );
  await act(async () => undefined);
  const label = document.querySelector<HTMLInputElement>(
    '[aria-label="Title label"]'
  )!;
  input(label, "Headline");
  await vi.waitFor(() => expect(updateContent).toHaveBeenCalledOnce());
  await vi.waitFor(() =>
    expect(document.querySelector('[role="alert"]')).not.toBeNull()
  );
  // Developer recovery instructions must not leak into the editing UI.
  expect(document.querySelector('[role="alert"]')?.textContent).not.toContain(
    failure.message
  );
  input(label, "Post title");
  await act(async () => new Promise((resolve) => setTimeout(resolve, 750)));
  expect(updateContent).toHaveBeenCalledOnce();
  expect(label.value).toBe("Post title");
  await act(async () =>
    document.querySelector<HTMLButtonElement>('[aria-label="Close"]')?.click()
  );
  expect(updateContent).toHaveBeenCalledOnce();
  expect(onOpenChange).not.toHaveBeenCalled();
  await vi.waitFor(() =>
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(2)
  );
});

test("starts new fields with empty label and key inputs", async () => {
  const updateContent = vi.fn(
    async ({ asset }: { asset: Asset; content: string }) => asset
  );
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
      updateContent={updateContent}
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
  ).toBe("");
  expect(
    document.querySelector<HTMLInputElement>('[aria-label="New field label"]')
      ?.value
  ).toBe("");
  const newKey = document.querySelector<HTMLInputElement>(
    '[aria-label="New field key"]'
  )!;
  const newLabel = document.querySelector<HTMLInputElement>(
    '[aria-label="New field label"]'
  )!;
  expect(document.activeElement).toBe(newLabel);
  // Wait past autosave: an untouched new field must remain free of errors.
  await act(async () => new Promise((resolve) => setTimeout(resolve, 700)));
  expect(document.querySelector('[aria-invalid="true"]')).toBeNull();
  expect(document.querySelector('[role="alert"]')).toBeNull();
  act(() => {
    newKey.focus();
    newLabel.focus();
  });
  await vi.waitFor(() =>
    expect(newKey.getAttribute("aria-invalid")).toBe("true")
  );
  const keyError = document.getElementById(
    newKey.getAttribute("aria-describedby")!
  );
  expect(keyError?.textContent).not.toBe("");
  expect(newKey.parentElement?.parentElement?.contains(keyError)).toBe(true);
  expect(updateContent).not.toHaveBeenCalled();
  input(
    document.querySelector<HTMLInputElement>('[aria-label="New field label"]')!,
    "Author"
  );
  input(
    document.querySelector<HTMLInputElement>('[aria-label="Author key"]')!,
    "author"
  );
  await vi.waitFor(() => expect(updateContent).toHaveBeenCalledOnce());
  expect(
    parseCollectionConfig(updateContent.mock.calls[0][0].content).fields.find(
      ({ key }) => key === "author"
    )
  ).toMatchObject({ label: "Author", type: "string" });
  const authorKey = document.querySelector<HTMLInputElement>(
    '[aria-label="Author key"]'
  )!;
  input(authorKey, " title ");
  await vi.waitFor(() =>
    expect(authorKey.getAttribute("aria-invalid")).toBe("true")
  );
  expect(
    document.getElementById(authorKey.getAttribute("aria-describedby")!)
      ?.textContent
  ).not.toBe("");
  act(() =>
    document
      .querySelector<HTMLButtonElement>('[aria-label="Edit Title"]')
      ?.click()
  );
  expect(
    document
      .querySelector('[aria-label="Title key"]')
      ?.getAttribute("aria-invalid")
  ).toBe("true");
  act(() =>
    document
      .querySelector<HTMLButtonElement>('[aria-label="Edit Author"]')
      ?.click()
  );
  const currentAuthorKey = document.querySelector<HTMLInputElement>(
    '[aria-label="Author key"]'
  )!;
  input(currentAuthorKey, "");
  await vi.waitFor(() =>
    expect(document.querySelector('[role="alert"]')).not.toBeNull()
  );
  input(currentAuthorKey, "author");
  await vi.waitFor(() =>
    expect(document.querySelector('[role="alert"]')).toBeNull()
  );
  expect(updateContent).toHaveBeenCalledOnce();
});

test("serializes automatic saves, preserves newer edits, and flushes on close", async () => {
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
    description: "An entry summary",
  };
  let resolveFirstSave: (asset: Asset) => void = () => {};
  const updateContent = vi.fn(
    async ({ asset, content }: { asset: Asset; content: string }) => {
      expect(
        parseCollectionConfig(content).fields.some(
          ({ key }) => key === "summaryText"
        )
      ).toBe(true);
      if (updateContent.mock.calls.length === 1) {
        return new Promise<Asset>((resolve) => {
          resolveFirstSave = resolve;
        });
      }
      return { ...asset, name: "latest-config.json" };
    }
  );
  const onOpenChange = vi.fn();
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
      onOpenChange={onOpenChange}
      readTemplateSource={async () => createDefaultCollectionTemplate()}
      updateContent={updateContent}
    />
  );
  await act(async () => undefined);
  act(() =>
    document
      .querySelector<HTMLButtonElement>('[aria-label="Edit Summary"]')
      ?.click()
  );
  const key = document.querySelector<HTMLInputElement>(
    '[aria-label="Summary key"]'
  )!;
  input(key, "summaryText");
  await vi.waitFor(() => expect(updateContent).toHaveBeenCalledOnce());
  const label = document.querySelector<HTMLInputElement>(
    '[aria-label="Summary label"]'
  )!;
  expect(label.disabled).toBe(false);
  input(label, "Description");
  expect(updateContent).toHaveBeenCalledOnce();
  const updatedAsset = { ...configAsset, name: "first-config.json" };
  await act(async () => resolveFirstSave(updatedAsset));
  await vi.waitFor(() => expect(updateContent).toHaveBeenCalledTimes(2));
  const secondSave = updateContent.mock.calls[1][0];
  expect(secondSave.asset).toEqual(updatedAsset);
  const schema = JSON.parse(secondSave.content);
  expect(schema.properties.summary).toBeUndefined();
  expect(schema.properties.summaryText).toMatchObject({
    title: "Description",
    description: "An entry summary",
  });
  expect(label.value).toBe("Description");
  expect(onOpenChange).not.toHaveBeenCalled();
  input(label, "Excerpt");
  await act(async () =>
    document.querySelector<HTMLButtonElement>('[aria-label="Close"]')?.click()
  );
  await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  expect(updateContent).toHaveBeenCalledTimes(3);
  expect(
    JSON.parse(updateContent.mock.calls[2][0].content).properties.summaryText
      .title
  ).toBe("Excerpt");
});

test("associates a missing label error with its input and clears it when corrected", async () => {
  const updateContent = vi.fn(
    async ({ asset }: { asset: Asset; content: string }) => asset
  );
  render(
    <CollectionSettingsDialog
      collection={{
        status: "ready",
        folderId: "posts",
        configAsset: createAsset({
          id: "config",
          filename: "collection",
          format: "json",
        }),
        templateAsset: createAsset({
          id: "template",
          filename: "template",
          format: "mdx",
        }),
        config: parseCollectionConfig(createDefaultCollectionConfig()),
        templateProperties: {},
      }}
      open
      onOpenChange={() => undefined}
      updateContent={updateContent}
      readTemplateSource={async () => createDefaultCollectionTemplate()}
    />
  );
  await act(async () => undefined);
  const label = document.querySelector<HTMLInputElement>(
    '[aria-label="Title label"]'
  )!;
  input(label, " ");
  await vi.waitFor(() =>
    expect(label.getAttribute("aria-invalid")).toBe("true")
  );
  const message = document.getElementById(
    label.getAttribute("aria-describedby")!
  );
  expect(message?.getAttribute("role")).toBe("alert");
  expect(document.querySelectorAll('[role="alert"]')).toHaveLength(1);
  expect(updateContent).not.toHaveBeenCalled();
  input(label, "Headline");
  await vi.waitFor(() => expect(updateContent).toHaveBeenCalledOnce());
  expect(label.hasAttribute("aria-invalid")).toBe(false);
  expect(document.querySelector('[role="alert"]')).toBeNull();
});

test("navigates fields with arrows and tabs out of the list", async () => {
  render(
    <CollectionSettingsDialog
      collection={{
        status: "ready",
        folderId: "posts",
        configAsset: createAsset({
          id: "config",
          filename: "collection",
          format: "json",
        }),
        templateAsset: createAsset({
          id: "template",
          filename: "template",
          format: "mdx",
        }),
        config: parseCollectionConfig(createDefaultCollectionConfig()),
        templateProperties: {},
      }}
      open
      onOpenChange={() => undefined}
      readTemplateSource={async () => createDefaultCollectionTemplate()}
    />
  );
  await act(async () => undefined);
  const title = document.querySelector<HTMLElement>(
    '[aria-label="Edit Title"]'
  )!;
  const slug = document.querySelector<HTMLElement>(
    '[aria-label="Edit URL slug"]'
  )!;
  const draft = document.querySelector<HTMLElement>(
    '[aria-label="Edit Draft"]'
  )!;
  act(() => title.focus());
  await userEvent.keyboard("{ArrowDown}");
  expect(document.activeElement).toBe(slug);
  await userEvent.keyboard("{Enter}");
  expect(slug.getAttribute("aria-current")).toBe("true");
  expect(
    document.querySelector('[aria-label="URL slug label"]')
  ).not.toBeNull();
  await userEvent.keyboard("{ArrowDown}");
  expect(document.activeElement).toBe(draft);
  await userEvent.keyboard("{ArrowDown}");
  expect(document.activeElement).toBe(title);
  await userEvent.keyboard("{ArrowUp}");
  expect(document.activeElement).toBe(draft);
  await userEvent.tab();
  expect(document.activeElement).toBe(
    document.querySelector('[aria-label="URL slug label"]')
  );
  act(() => title.focus());
  await userEvent.tab();
  expect(document.activeElement).toBe(
    document.querySelector('[aria-label="URL slug label"]')
  );
});

test("confirms conversion, keeps focus on cancellation, and retries failures", async () => {
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
  let finish: () => void = () => undefined;
  const convertCollection = vi
    .fn<(asset: Asset) => Promise<void>>()
    .mockRejectedValueOnce(new Error("Conversion failed"))
    .mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
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
      convertCollection={convertCollection}
      readTemplateSource={async () => createDefaultCollectionTemplate()}
    />
  );
  await act(async () => undefined);
  const openConfirmation = async () => {
    const action = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Convert to regular folder"]'
    );
    expect(action).not.toBeNull();
    await act(async () => action?.click());
  };
  const button = (label: string) =>
    Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
      .filter((button) => button.textContent === label)
      .at(-1)!;
  await openConfirmation();
  await vi.waitFor(() =>
    expect(document.activeElement).toBe(button("Convert to regular folder"))
  );
  expect(convertCollection).not.toHaveBeenCalled();
  await act(async () => button("Keep collection").click());
  expect(onOpenChange).not.toHaveBeenCalled();
  await openConfirmation();
  await act(async () => button("Convert to regular folder").click());
  await vi.waitFor(() =>
    expect(document.querySelector('[role="alert"]')?.textContent).toBe(
      "Conversion failed"
    )
  );
  expect(onOpenChange).not.toHaveBeenCalled();
  await act(async () => button("Convert to regular folder").click());
  expect(button("Converting…").disabled).toBe(true);
  expect(button("Keep collection").disabled).toBe(true);
  await act(async () =>
    document
      .querySelectorAll<HTMLButtonElement>('[aria-label="Close"]')
      .forEach((button) => button.click())
  );
  expect(onOpenChange).not.toHaveBeenCalled();
  await act(async () => finish());
  await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  expect(convertCollection).toHaveBeenCalledTimes(2);
  expect(convertCollection).toHaveBeenLastCalledWith(configAsset);
});

test("allows collection fields to change while existing entries are repaired", async () => {
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
  ).toBe(false);
  act(() => {
    document
      .querySelector<HTMLButtonElement>('[aria-label="Edit Summary"]')
      ?.click();
  });
  expect(
    document.querySelector<HTMLInputElement>('[aria-label="Summary key"]')
      ?.disabled
  ).toBe(false);
  expect(
    document.querySelector<HTMLButtonElement>('[aria-label="Summary type"]')
      ?.disabled
  ).toBe(false);
  expect(
    document.querySelector<HTMLButtonElement>('[aria-label="Remove Summary"]')
      ?.disabled
  ).toBe(false);
});
