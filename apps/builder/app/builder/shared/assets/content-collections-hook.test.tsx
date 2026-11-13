import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";
import type { Asset } from "@webstudio-is/sdk";
import { createDefaultCollectionConfig } from "@webstudio-is/content-engine";
import { $assets, $project } from "~/shared/sync/data-stores";
import {
  createAssetContentBridge,
  __testing__,
} from "~/shared/asset-content-bridge.client";
import {
  assetContentDescriptorHeader,
  serializeAssetContentDescriptor,
} from "@webstudio-is/protocol/asset-resource-api";
import { useContentCollections } from "./content-collections";

const { initBridge, clearBridge } = __testing__;
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test("shares collection reads across consumers and refreshes them together", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const files: Asset[] = ["collection.json", "template.mdx"].map((name) => ({
    id: name,
    name,
    projectId: "project",
    folderId: "posts",
    type: "file",
    format: name.endsWith("json") ? "json" : "mdx",
    size: 1,
    meta: {},
    createdAt: "2026-09-08T00:00:00Z",
  }));
  let requests = 0;
  let unavailable = false;
  let title = "Title";
  let holdConfig: Promise<void> | undefined;
  initBridge(
    createAssetContentBridge({
      origin: window.location.origin,
      authorize: () => true,
      requireReload: () => undefined,
      request: async (url) => {
        requests += 1;
        if (unavailable) {
          throw new Error("Offline");
        }
        const isConfig = String(url).includes("collection.json");
        const schema = JSON.parse(createDefaultCollectionConfig());
        schema.properties.title.title = title;
        const source = isConfig
          ? JSON.stringify(schema)
          : "---\ndraft: true\n---\n";
        if (isConfig) {
          await holdConfig;
        }
        const asset = {
          ...files[isConfig ? 0 : 1],
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
  const Consumer = ({
    refresh = 0,
    folder = "posts",
  }: {
    refresh?: number;
    folder?: string;
  }) => {
    const collection = useContentCollections(folder, refresh).get(folder);
    return (
      <output>
        {collection?.status === "ready"
          ? collection.config.fields[0].label
          : (collection?.status ?? "none")}
      </output>
    );
  };
  try {
    $assets.set(new Map(files.map((file) => [file.id, file])));
    $project.set({ id: "project" } as never);
    act(() =>
      root.render(
        <>
          <Consumer />
          <Consumer />
          <Consumer folder="ordinary" />
        </>
      )
    );
    await vi.waitFor(() =>
      expect(container.textContent).toBe("TitleTitlenone")
    );
    expect(requests).toBe(2);
    act(() =>
      root.render(
        <>
          <Consumer />
          <Consumer />
          <Consumer />
        </>
      )
    );
    await vi.waitFor(() =>
      expect(container.textContent).toBe("TitleTitleTitle")
    );
    expect(requests).toBe(2);

    // An entry edit must not download the unchanged schema and template again.
    act(() =>
      $assets.set(
        new Map([
          ...$assets.get(),
          ["entry", { ...files[1], id: "entry", name: "post.mdx" }],
        ])
      )
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(requests).toBe(2);

    // Metadata-only collisions still invalidate the cached collection.
    act(() =>
      $assets.set(
        new Map([
          ...$assets.get(),
          ["duplicate", { ...files[1], id: "duplicate", name: "POST.mdx" }],
        ])
      )
    );
    await vi.waitFor(() =>
      expect(container.textContent).toBe("invalidinvalidinvalid")
    );
    act(() => {
      const assets = new Map($assets.get());
      assets.delete("duplicate");
      $assets.set(assets);
    });
    await vi.waitFor(() =>
      expect(container.textContent).toBe("TitleTitleTitle")
    );

    unavailable = true;
    act(() =>
      root.render(
        <>
          <Consumer refresh={1} />
          <Consumer />
          <Consumer />
        </>
      )
    );
    await vi.waitFor(() =>
      expect(container.textContent).toBe("unavailableunavailableunavailable")
    );
    unavailable = false;
    title = "Updated title";
    act(() =>
      root.render(
        <>
          <Consumer refresh={2} />
          <Consumer />
          <Consumer />
        </>
      )
    );
    await vi.waitFor(() =>
      expect(container.textContent).toBe(
        "Updated titleUpdated titleUpdated title"
      )
    );

    let release: () => void = () => {};
    holdConfig = new Promise<void>((resolve) => {
      release = resolve;
    });
    title = "Stale title";
    const beforeRefresh = requests;
    act(() =>
      root.render(
        <>
          <Consumer refresh={3} />
          <Consumer />
          <Consumer />
        </>
      )
    );
    await vi.waitFor(() => expect(requests).toBe(beforeRefresh + 1));
    let releaseLatest: () => void = () => {};
    holdConfig = new Promise<void>((resolve) => {
      releaseLatest = resolve;
    });
    title = "Latest title";
    act(() =>
      root.render(
        <>
          <Consumer refresh={4} />
          <Consumer />
          <Consumer />
        </>
      )
    );
    await vi.waitFor(() => expect(requests).toBe(beforeRefresh + 2));
    await act(async () => {
      release();
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(container.textContent).toBe(
      "Updated titleUpdated titleUpdated title"
    );
    await act(async () => {
      releaseLatest();
    });
    await vi.waitFor(() =>
      expect(container.textContent).toBe("Latest titleLatest titleLatest title")
    );
    expect(container.textContent).toBe("Latest titleLatest titleLatest title");

    // Project switches cannot expose a previous project's cached collection.
    act(() => $project.set({ id: "other-project" } as never));
    await vi.waitFor(() => expect(container.textContent).toBe("nonenonenone"));
  } finally {
    act(() => root.unmount());
    container.remove();
    $assets.set(new Map());
    $project.set(undefined);
    clearBridge();
  }
});
