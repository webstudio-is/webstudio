import { expect, test, vi } from "vitest";
import { createAssetContentSession } from "@webstudio-is/content-engine/asset-content-session";
import type { Asset } from "@webstudio-is/sdk";
import {
  createAssetContentBridge,
  __testing__,
} from "./asset-content-bridge.client";
import { $externalContentHistory } from "./external-content-history";
import { $externalContentRoots } from "./external-content-mutations";
import {
  disposeExternalContentProject,
  flushExternalContentAsset,
  traverseExternalContentHistory,
  updateExternalContentAssetSource,
} from "./external-content-roots";

const { initBridge, clearBridge } = __testing__;

test("undo and redo save source changes in order across article and author files", async () => {
  const projectId = "history-project";
  const stored = new Map([
    ["article", "# Original"],
    ["author", "---\nname: Original\n---"],
  ]);
  const describeAsset = (assetId: string): Asset => ({
    id: assetId,
    projectId,
    name: `${assetId}.mdx`,
    format: "mdx",
    type: "file",
    size: new TextEncoder().encode(stored.get(assetId)!).byteLength,
    meta: {},
    createdAt: "2026-01-01T00:00:00.000Z",
  });
  const session = createAssetContentSession({
    repository: {
      readContent: async ({ assetId }) => ({
        asset: describeAsset(assetId),
        data: (async function* () {
          yield new TextEncoder().encode(stored.get(assetId)!);
        })(),
      }),
      updateContent: async ({ assetId, data }) => {
        stored.set(assetId, await new Response(data).text());
        return describeAsset(assetId);
      },
    },
    authorize: () => true,
    debounceMilliseconds: 0,
  });
  initBridge(
    createAssetContentBridge({
      origin: window.location.origin,
      request: fetch,
      authorize: () => true,
      requireReload: vi.fn(),
      getContentSession: () => session,
    })
  );
  try {
    await session.open("article");
    await session.open("author");
    await updateExternalContentAssetSource({
      projectId,
      assetId: "article",
      update: () => "# Changed",
    });
    $externalContentRoots.set(
      new Map([
        [
          "pending-root",
          {
            projectId,
            assetId: "author",
            blockInstanceId: "block",
            instanceIds: new Set(),
            mutationRevision: 1,
            savedMutationRevision: 0,
          },
        ],
      ])
    );
    let traversed = false;
    const pendingUndo = traverseExternalContentHistory({
      projectId,
      direction: "undo",
    }).then(() => {
      traversed = true;
    });
    // Let the queued command run while the canvas is still serializing its edit.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(traversed).toBe(false);
    await updateExternalContentAssetSource({
      projectId,
      assetId: "author",
      update: () => "---\nname: Changed\n---",
    });
    $externalContentRoots.set(new Map());
    await pendingUndo;
    expect(session.get("author")?.source).toBe("---\nname: Original\n---");
    expect(session.get("article")?.source).toBe("# Changed");
    await traverseExternalContentHistory({ projectId, direction: "undo" });
    expect(session.get("article")?.source).toBe("# Original");
    await Promise.all([
      traverseExternalContentHistory({ projectId, direction: "redo" }),
      traverseExternalContentHistory({ projectId, direction: "redo" }),
    ]);
    expect(session.get("article")?.source).toBe("# Changed");
    expect(session.get("author")?.source).toBe("---\nname: Changed\n---");
    await flushExternalContentAsset({ projectId, assetId: "article" });
    await flushExternalContentAsset({ projectId, assetId: "author" });
    expect(stored.get("article")).toBe("# Changed");
    expect(stored.get("author")).toBe("---\nname: Changed\n---");
    await traverseExternalContentHistory({ projectId, direction: "undo" });
    await updateExternalContentAssetSource({
      projectId,
      assetId: "author",
      update: () => "---\nname: New edit\n---",
    });
    await traverseExternalContentHistory({ projectId, direction: "redo" });
    expect(session.get("author")?.source).toBe("---\nname: New edit\n---");

    // A source replaced outside this history must never be overwritten by undo.
    session.save("author", "---\nname: Concurrent edit\n---");
    await expect(
      traverseExternalContentHistory({ projectId, direction: "undo" })
    ).rejects.toThrow("changed since this edit");
    expect(session.get("author")?.source).toBe(
      "---\nname: Concurrent edit\n---"
    );
  } finally {
    $externalContentRoots.set(new Map());
    await updateExternalContentAssetSource({
      projectId,
      assetId: "author",
      update: (source) => source,
    });
    await disposeExternalContentProject({ projectId, session });
    expect($externalContentHistory.get().has(projectId)).toBe(false);
    session.dispose();
    clearBridge();
  }
});
