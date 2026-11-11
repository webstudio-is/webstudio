import { useEffect, useState } from "react";
import type { Asset } from "@webstudio-is/sdk";
import type { Project } from "@webstudio-is/project";
import {
  createAssetFolderFixture,
  createAssetFoldersFixture,
} from "@webstudio-is/sdk/testing";
import { createDefaultPages } from "@webstudio-is/project-build";
import { createDefaultCollectionConfig } from "@webstudio-is/content-engine";
import {
  assetContentDescriptorHeader,
  serializeAssetContentDescriptor,
} from "@webstudio-is/protocol/asset-resource-api";
import {
  createAssetContentBridge,
  getAssetContentBridge,
  __testing__,
} from "~/shared/asset-content-bridge.client";
import {
  $assets,
  $assetFolders,
  $pages,
  $project,
} from "~/shared/sync/data-stores";
import { $authPermit, $builderMode } from "~/shared/nano-states";
import { $settings } from "~/builder/shared/client-settings";
import { AssetsPanel } from "./assets";
const { initBridge, clearBridge } = __testing__;
export default { title: "Assets/Collections", component: AssetsPanel };
type State =
  | "ready"
  | "loading"
  | "invalid"
  | "missingTemplate"
  | "unavailable"
  | "entryWarning"
  | "readOnly";
const CollectionStory = ({ state }: { state: State }) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const previous = [
      $assets.get(),
      $assetFolders.get(),
      $pages.get(),
      $project.get(),
      $authPermit.get(),
      $builderMode.get(),
      $settings.get(),
    ] as const;
    let previousBridge: ReturnType<typeof getAssetContentBridge> | undefined;
    try {
      previousBridge = getAssetContentBridge();
    } catch {}
    const projectId = `collection-story-${state}`;
    const sources = new Map([
      [
        "collection.json",
        state === "invalid" ? "{}" : createDefaultCollectionConfig(),
      ],
      [
        "template.mdx",
        "---\ntitle: Article\nslug: article\ndraft: true\n---\n# Article",
      ],
      [
        "post.mdx",
        state === "entryWarning"
          ? "---\ntitle: \nslug: wrong\ndraft: yes\n---\nBody"
          : "---\ntitle: Post\nslug: post\ndraft: false\n---\nBody",
      ],
    ]);
    if (state === "missingTemplate") {
      sources.delete("template.mdx");
    }
    const files: Asset[] = Array.from(sources, ([name, source]) => ({
      id: name,
      name,
      projectId,
      folderId: "posts",
      type: "file",
      format: name.endsWith("json") ? "json" : "mdx",
      size: new TextEncoder().encode(source).length,
      meta: {},
      createdAt: "2026-11-01T00:00:00Z",
    }));
    initBridge(
      createAssetContentBridge({
        origin: location.origin,
        authorize: () => true,
        requireReload: () => {},
        request: async (url, init) => {
          if (state === "loading") {
            return new Promise<Response>(() => {});
          }
          if (state === "unavailable") {
            throw new Error("Example offline response");
          }
          if (init?.method && init.method !== "GET") {
            return new Response(undefined, { status: 403 });
          }
          const name = decodeURIComponent(new URL(url).pathname.split("/")[3]);
          const asset = files.find((file) => file.id === name);
          if (!asset) {
            return new Response(undefined, { status: 404 });
          }
          return new Response(sources.get(name), {
            // Each fixture fits in the initial frontmatter read range.
            status: new Headers(init?.headers).has("range") ? 206 : 200,
            headers: {
              [assetContentDescriptorHeader]:
                serializeAssetContentDescriptor(asset),
            },
          });
        },
      })
    );
    $project.set({ id: projectId, title: "Collection example" } as Project);
    $assets.set(new Map(files.map((file) => [file.id, file])));
    $assetFolders.set(
      createAssetFoldersFixture(
        createAssetFolderFixture({ id: "posts", name: "Posts" })
      )
    );
    $pages.set(createDefaultPages({ rootInstanceId: "body" }));
    $authPermit.set(state === "readOnly" ? "view" : "own");
    $builderMode.set("design");
    $settings.set({
      ...$settings.get(),
      lastAssetFolderIds: { [projectId]: "posts" },
    });
    setReady(true);
    return () => {
      setReady(false);
      $assets.set(previous[0]);
      $assetFolders.set(previous[1]);
      $pages.set(previous[2]);
      $project.set(previous[3]);
      $authPermit.set(previous[4]);
      $builderMode.set(previous[5]);
      $settings.set(previous[6]);
      if (previousBridge) {
        initBridge(previousBridge);
      } else {
        clearBridge();
      }
    };
  }, [state]);
  return ready ? (
    <div
      style={{
        width: 320,
        height: 800,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AssetsPanel publish={() => {}} onClose={() => {}} />
    </div>
  ) : null;
};
export const Ready = () => <CollectionStory state="ready" />;
export const Loading = () => <CollectionStory state="loading" />;
export const InvalidConfiguration = () => <CollectionStory state="invalid" />;
export const MissingTemplate = () => (
  <CollectionStory state="missingTemplate" />
);
export const Unavailable = () => <CollectionStory state="unavailable" />;
export const EntryWarning = () => <CollectionStory state="entryWarning" />;
export const ReadOnly = () => <CollectionStory state="readOnly" />;
