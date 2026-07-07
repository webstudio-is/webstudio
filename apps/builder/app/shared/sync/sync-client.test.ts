import { describe, expect, test } from "vitest";
import { __testing__ } from "./sync-client";
import type { LoadedBuilderData } from "~/shared/builder-data";
import { serverSyncStoreNames } from "./sync-stores";

const { getServerSyncState, resolveMultiplayerRelayUrl } = __testing__;

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
      marketplaceProduct: "marketplaceProduct",
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
        ["marketplaceProduct", "marketplaceProduct"],
      ])
    );
    expect([...serverSyncState.keys()]).not.toContain("project");
    expect([...serverSyncState.keys()]).not.toContain("publisherHost");
  });
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
