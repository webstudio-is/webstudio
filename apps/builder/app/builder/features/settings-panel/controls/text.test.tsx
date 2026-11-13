import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import {
  blockComponent,
  contentBlockDocumentProp,
  encodeDataSourceVariable,
  type Instance,
  type Prop,
} from "@webstudio-is/sdk";
import { $builderMode, selectInstance } from "~/shared/nano-states";
import {
  $assets,
  $project,
  $instances,
  $props,
} from "~/shared/sync/data-stores";
import { createDefaultCollectionConfig } from "@webstudio-is/content-engine";
import {
  createAssetContentBridge,
  __testing__,
} from "~/shared/asset-content-bridge.client";
import {
  assetContentDescriptorHeader,
  serializeAssetContentDescriptor,
} from "@webstudio-is/protocol/asset-resource-api";
import type { Asset } from "@webstudio-is/sdk";
import { $externalContentRoots } from "~/shared/external-content-mutations";
import { TextControl } from "./text";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
const { initBridge, clearBridge } = __testing__;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const block: Instance = {
    type: "instance",
    id: "block",
    component: blockComponent,
    children: [{ type: "id", value: "heading" }],
  };
  const heading: Instance = {
    type: "instance",
    id: "heading",
    component: "Heading",
    children: [],
  };
  const documentProp: Prop = {
    id: "document",
    instanceId: block.id,
    name: contentBlockDocumentProp,
    type: "parameter",
    value: "document-data-source",
  };
  const titleProp: Prop = {
    id: "title",
    instanceId: heading.id,
    name: "title",
    type: "expression",
    value: `${encodeDataSourceVariable("document-data-source")}.frontmatter.title`,
    mode: "readwrite",
  };
  const sourceProp: Prop = {
    id: "source",
    instanceId: block.id,
    name: "src",
    type: "asset",
    value: "article",
  };
  $instances.set(
    new Map([
      [block.id, block],
      [heading.id, heading],
    ])
  );
  $props.set(
    new Map<string, Prop>([
      [documentProp.id, documentProp],
      [sourceProp.id, sourceProp],
      [titleProp.id, titleProp],
    ])
  );
  $externalContentRoots.set(
    new Map([
      [
        "root",
        {
          blockInstanceId: block.id,
          instanceIds: new Set([heading.id]),
          mutationRevision: 0,
          document: {
            frontmatter: { properties: { title: "Before" } },
            children: [],
          },
        },
      ],
    ])
  );
  $builderMode.set("content");
  selectInstance([heading.id, block.id]);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  selectInstance(undefined);
  $instances.set(new Map());
  $props.set(new Map());
  $externalContentRoots.set(new Map());
  $builderMode.set("design");
  $assets.set(new Map());
  $project.set(undefined);
  clearBridge();
});

test("shows a collection field error on an editable Content-mode input", async () => {
  const files: Asset[] = ["article.mdx", "collection.json", "template.mdx"].map(
    (name) => ({
      id: name === "article.mdx" ? "article" : name,
      projectId: "project",
      name,
      folderId: "posts",
      type: "file",
      format: name.endsWith("json") ? "json" : "mdx",
      size: 1,
      meta: {},
      createdAt: "2026-09-08T00:00:00Z",
    })
  );
  $assets.set(new Map(files.map((asset) => [asset.id, asset])));
  $project.set({ id: "project" } as never);
  const roots = new Map($externalContentRoots.get());
  roots.set("root", {
    ...roots.get("root")!,
    assetId: "article",
    document: {
      children: [],
      frontmatter: { properties: { title: "", slug: "article" } },
    },
  });
  $externalContentRoots.set(roots);
  initBridge(
    createAssetContentBridge({
      origin: window.location.origin,
      authorize: () => true,
      requireReload: () => undefined,
      request: async (url) => {
        const isConfig = String(url).includes("collection.json");
        const source = isConfig
          ? createDefaultCollectionConfig()
          : "---\ndraft: true\n---\n";
        const asset = {
          ...files[isConfig ? 1 : 2],
          size: new TextEncoder().encode(source).length,
        };
        return new Response(source, {
          headers: {
            [assetContentDescriptorHeader]:
              serializeAssetContentDescriptor(asset),
          },
        });
      },
    })
  );
  act(() =>
    root.render(
      <TooltipProvider>
        <TextControl
          instanceId="heading"
          meta={{ type: "string", control: "text", required: false }}
          prop={$props.get().get("title")}
          propName="title"
          computedValue=""
          onChange={vi.fn()}
        />
      </TooltipProvider>
    )
  );
  await vi.waitFor(() =>
    expect(
      container.querySelector("textarea")?.getAttribute("aria-invalid")
    ).toBe("true")
  );
  expect(container.querySelector("textarea")).not.toBeDisabled();
  act(() => {
    const assets = new Map($assets.get());
    assets.set("article", {
      ...assets.get("article")!,
      type: "file",
      meta: {},
      filename: "support",
      format: "txt",
    });
    $assets.set(assets);
  });
  await vi.waitFor(() =>
    expect(
      container.querySelector("textarea")?.getAttribute("aria-invalid")
    ).toBeNull()
  );
});

test("saves an edited direct frontmatter binding without exposing the binding", () => {
  const onChange = vi.fn();
  const prop = $props.get().get("title");
  if (prop === undefined) {
    throw new Error("Expected title prop");
  }
  act(() => {
    root.render(
      <TooltipProvider>
        <TextControl
          instanceId="heading"
          meta={{ type: "string", control: "text", required: false }}
          prop={prop}
          propName="title"
          computedValue="Before"
          onChange={onChange}
        />
      </TooltipProvider>
    );
  });
  const input = container.querySelector<HTMLTextAreaElement>("textarea");
  if (input === null) {
    throw new Error("Expected text control");
  }

  expect(input.disabled).toBe(false);
  expect(container.querySelector('[data-variant="bound"]')).toBeNull();
  act(() => {
    input.focus();
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value"
    )?.set?.call(input, "After");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  act(() => {
    input.blur();
  });

  expect(onChange).toHaveBeenCalledWith({ type: "string", value: "After" });
});
