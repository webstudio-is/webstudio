import { afterEach, describe, expect, test, vi } from "vitest";
import { atom } from "nanostores";
import type { SyncEmitter } from "@webstudio-is/sync-client";
import { __testing__ } from "./sync-client";
import type { LoadedBuilderData } from "~/shared/builder-data";
import { serverSyncStoreNames } from "./sync-stores";
import {
  $externalContentRoots,
  __testing__ as externalContentMutationsTesting,
  subscribeExternalContentTemplateMutations,
  type ExternalContentRoot,
} from "../external-content-mutations";
import {
  NanoEventsSyncEmitter,
  NanostoresSyncObject,
  SyncClient,
} from "../sync-client";

const { applyBuilderData, getServerSyncState, resolveMultiplayerRelayUrl } =
  __testing__;
const { observeExternalContentRootMutations } = externalContentMutationsTesting;

afterEach(() => {
  $externalContentRoots.set(new Map());
});

describe("getServerSyncState", () => {
  test("keeps only server-synchronized builder data", () => {
    const data = {
      id: "build-1",
      version: 1,
      projectId: "project-1",
      project: { id: "project-1" },
      publisherHost: "example.com",
      pages: "pages",
      breakpoints: "breakpoints",
      instances: "instances",
      styles: "styles",
      styleSources: "styleSources",
      styleSourceSelections: "styleSourceSelections",
      props: "props",
      dataSources: "dataSources",
      resources: "resources",
      assets: "assets",
      assetFolders: "assetFolders",
      marketplaceProduct: "marketplaceProduct",
      projectSettings: "projectSettings",
    } as unknown as LoadedBuilderData;

    const serverSyncState = getServerSyncState(data);

    expect([...serverSyncState.keys()]).toEqual([...serverSyncStoreNames]);
    expect(serverSyncState).toEqual(
      new Map<string, unknown>([
        ["pages", "pages"],
        ["breakpoints", "breakpoints"],
        ["instances", "instances"],
        ["styles", "styles"],
        ["styleSources", "styleSources"],
        ["styleSourceSelections", "styleSourceSelections"],
        ["props", "props"],
        ["dataSources", "dataSources"],
        ["resources", "resources"],
        ["assets", "assets"],
        ["assetFolders", "assetFolders"],
        ["projectSettings", "projectSettings"],
        ["marketplaceProduct", "marketplaceProduct"],
      ])
    );
    expect([...serverSyncState.keys()]).not.toContain("project");
    expect([...serverSyncState.keys()]).not.toContain("publisherHost");
  });
});

test("refreshes mounted external templates after a full project reload", () => {
  $externalContentRoots.set(
    new Map([
      [
        "current-root",
        {
          blockInstanceId: "current-block",
          instanceIds: new Set<string>(),
          mutationRevision: 0,
          projectId: "project-1",
        },
      ],
      [
        "other-root",
        {
          blockInstanceId: "other-block",
          instanceIds: new Set<string>(),
          mutationRevision: 0,
          projectId: "project-2",
        },
      ],
    ])
  );
  const refreshes: string[][] = [];
  const unsubscribe = subscribeExternalContentTemplateMutations((rootKeys) => {
    refreshes.push([...rootKeys]);
  });

  try {
    applyBuilderData({
      id: "build-1",
      version: 1,
      projectId: "project-1",
      project: { id: "project-1" },
      publisherHost: "example.com",
      pages: {},
      breakpoints: new Map(),
      instances: new Map(),
      styles: new Map(),
      styleSources: new Map(),
      styleSourceSelections: new Map(),
      props: new Map(),
      dataSources: new Map(),
      resources: new Map(),
      assets: new Map(),
      assetFolders: new Map(),
      marketplaceProduct: undefined,
      projectSettings: { meta: {}, compiler: {} },
    } as unknown as LoadedBuilderData);
  } finally {
    unsubscribe();
  }

  expect(refreshes).toEqual([["current-root"]]);
  expect(
    $externalContentRoots.get().get("current-root")?.templateMutationRevision
  ).toBe(1);
  expect(
    $externalContentRoots.get().get("other-root")?.templateMutationRevision
  ).toBeUndefined();
});

test("refreshes canvas templates once after a full project reload crosses realms", async () => {
  $externalContentRoots.set(
    new Map([
      [
        "current-root",
        {
          blockInstanceId: "current-block",
          instanceIds: new Set<string>(),
          mutationRevision: 0,
          projectId: "project-1",
        },
      ],
    ])
  );
  const $canvasRoots = atom(new Map<string, ExternalContentRoot>());
  const canvasRefreshes: string[][] = [];
  const unsubscribeCanvasObserver = observeExternalContentRootMutations({
    store: $canvasRoots,
    onMutation: () => {},
    onTemplateMutation(rootKeys) {
      canvasRefreshes.push([...rootKeys]);
    },
  });
  const innerEmitter = new NanoEventsSyncEmitter();
  // Builder and canvas have separate Nanostores listener queues. Deferring the
  // shared emitter reproduces that boundary while both stores run in this test.
  const emitter: SyncEmitter = {
    emit(message) {
      const received = structuredClone(message);
      queueMicrotask(() => innerEmitter.emit(received));
    },
    on(handler) {
      return innerEmitter.on(handler);
    },
  };
  const builderController = new AbortController();
  const canvasController = new AbortController();
  new SyncClient({
    role: "leader",
    object: new NanostoresSyncObject(
      "externalContentRoots",
      $externalContentRoots
    ),
    emitter,
  }).connect({ signal: builderController.signal });
  new SyncClient({
    role: "follower",
    object: new NanostoresSyncObject("externalContentRoots", $canvasRoots),
    emitter,
  }).connect({ signal: canvasController.signal });

  try {
    await vi.waitFor(() =>
      expect($canvasRoots.get().has("current-root")).toBe(true)
    );
    expect(
      $canvasRoots.get().get("current-root")?.templateMutationRevision
    ).toBeUndefined();

    applyBuilderData({
      id: "build-1",
      version: 1,
      projectId: "project-1",
      project: { id: "project-1" },
      publisherHost: "example.com",
      pages: {},
      breakpoints: new Map(),
      instances: new Map(),
      styles: new Map(),
      styleSources: new Map(),
      styleSourceSelections: new Map(),
      props: new Map(),
      dataSources: new Map(),
      resources: new Map(),
      assets: new Map(),
      assetFolders: new Map(),
      marketplaceProduct: undefined,
      projectSettings: { meta: {}, compiler: {} },
    } as unknown as LoadedBuilderData);
    await vi.waitFor(() =>
      expect(
        $canvasRoots.get().get("current-root")?.templateMutationRevision
      ).toBe(1)
    );
  } finally {
    builderController.abort();
    canvasController.abort();
    unsubscribeCanvasObserver();
  }

  expect(
    $externalContentRoots.get().get("current-root")?.templateMutationRevision
  ).toBe(1);
  expect($canvasRoots.get().get("current-root")?.templateMutationRevision).toBe(
    1
  );
  expect(canvasRefreshes).toEqual([["current-root"]]);
});

describe("resolveMultiplayerRelayUrl", () => {
  test("keeps configured absolute URL outside local wstd.dev", () => {
    expect(
      resolveMultiplayerRelayUrl(
        "https://apps.webstudio.is/collab-relay",
        "https://builder.webstudio.is/builder/project-id"
      )
    ).toBe("https://apps.webstudio.is/collab-relay");
  });

  test("keeps configured absolute URL on local wstd.dev", () => {
    expect(
      resolveMultiplayerRelayUrl(
        "https://apps.webstudio.is/collab-relay",
        "https://p-project-id.wstd.dev:5173/builder/project-id"
      )
    ).toBe("https://apps.webstudio.is/collab-relay");
  });

  test("proxies relative relay URLs through the local wstd.dev dev server", () => {
    expect(
      resolveMultiplayerRelayUrl(
        "/collab-relay",
        "https://p-project-id.wstd.dev:5173/builder/project-id"
      )
    ).toBe("https://p-project-id.wstd.dev:5173/collab-relay");
  });

  test("supports relative relay URLs", () => {
    expect(
      resolveMultiplayerRelayUrl(
        "/collab-relay",
        "https://builder.webstudio.is/builder/project-id"
      )
    ).toBe("https://builder.webstudio.is/collab-relay");
  });
});
