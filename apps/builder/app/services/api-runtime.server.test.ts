import { describe, expect, test } from "vitest";
import { TRPCError } from "@trpc/server";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { CompactBuild } from "@webstudio-is/project-build";
import { createEmptyWebstudioFragment } from "@webstudio-is/project-build/runtime";
import { executeBuilderRuntimeOperation } from "@webstudio-is/project-build/runtime";
import type { Asset } from "@webstudio-is/sdk";
import {
  createBuilderRuntimeState,
  executeApiRuntimeOperation,
} from "./api-runtime.server";

const createBuild = (): CompactBuild =>
  ({
    id: "build-1",
    projectId: "project-1",
    version: 1,
    pages: createDefaultPages({ rootInstanceId: "root-1" }),
    instances: [
      {
        type: "instance",
        id: "root-1",
        component: "Body",
        children: [],
      },
    ],
    props: [],
    styles: [],
    styleSources: [],
    styleSourceSelections: [],
    dataSources: [],
    resources: [],
    assets: [],
    breakpoints: [],
  }) as unknown as CompactBuild;

describe("api runtime adapter", () => {
  test("normalizes compact build arrays into builder state maps", () => {
    const asset = { id: "asset-1", name: "image.png" } as Asset;
    const state = createBuilderRuntimeState(createBuild(), [asset]);

    expect(state.pages?.homePageId).toBeDefined();
    expect(state.instances?.get("root-1")).toMatchObject({
      id: "root-1",
      component: "Body",
    });
    expect(state.assets?.get("asset-1")).toEqual(asset);
    expect(state.assets?.get("asset-1")).not.toBe(asset);
  });

  test("executes runtime reads and maps runtime errors to public api errors", async () => {
    const build = createBuild();

    await expect(
      executeApiRuntimeOperation({
        id: "pages.list",
        build,
        input: { projectId: "project-1" },
      })
    ).resolves.toMatchObject({
      pages: [expect.objectContaining({ isHome: true })],
    });

    await expect(
      executeApiRuntimeOperation({
        id: "pages.get",
        build,
        input: { pageId: "missing" },
      })
    ).rejects.toThrow("Page not found");
  });

  test("uses the shared Content Block source application for API inspection", async () => {
    await expect(
      executeApiRuntimeOperation({
        id: "contentBlocks.inspectSource",
        build: createBuild(),
        input: { blockInstanceId: "root-1", renderScope: "page:/" },
        context: {
          contentStorageApplication: {
            getMaterializedContent: () => [],
            saveStorageChanges: async () => ({ status: "complete" }),
            inspectSource: async (input) => ({
              ...input,
              sessionStatus: "disconnected",
              pending: false,
              diagnostics: [],
              capabilities: {
                canConnect: true,
                canSwitch: false,
                canDisconnectWithCopy: false,
                canEdit: false,
                canRetry: false,
                canReloadRemote: false,
                canCopyUnsavedSource: false,
              },
              repairRoutes: [],
            }),
          },
        },
      })
    ).resolves.toMatchObject({
      blockInstanceId: "root-1",
      renderScope: "page:/",
      sessionStatus: "disconnected",
      capabilities: { canConnect: true },
    });
  });

  test("uses the per-request API project commit capability for Content Block lifecycle", async () => {
    let committed = false;
    const inspection = {
      blockInstanceId: "root-1",
      renderScope: "page:/",
      sessionStatus: "saved" as const,
      pending: false,
      diagnostics: [],
      capabilities: {
        canConnect: false,
        canSwitch: true,
        canDisconnectWithCopy: true,
        canEdit: true,
        canRetry: false,
        canReloadRemote: false,
        canCopyUnsavedSource: false,
      },
      repairRoutes: ["disconnect-with-copy" as const],
    };
    await expect(
      executeApiRuntimeOperation({
        id: "contentBlocks.connectSource",
        build: createBuild(),
        input: {
          blockInstanceId: "root-1",
          renderScope: "page:/",
          source: { type: "asset", assetId: "article" },
          authority: "use-file-content",
        },
        context: {
          commitApplicationProjectPayload: async ({ expectedVersion }) => {
            expect(expectedVersion).toBe(1);
            committed = true;
            return { version: 2 };
          },
          contentStorageApplication: {
            getMaterializedContent: () => [],
            saveStorageChanges: async () => ({ status: "complete" }),
            inspectSource: async () => inspection,
            applyLifecycle: async (_input, execution) => {
              await execution?.commitProjectPayload?.([]);
              return {
                status: "complete",
                result: {
                  action: "connect",
                  changesProject: true,
                  storageWrites: [],
                  diagnostics: [],
                  persistenceOrder: "none",
                },
              };
            },
          },
        },
      })
    ).resolves.toMatchObject({
      status: "complete",
      source: { renderScope: "page:/" },
      plan: { action: "connect", changesProject: true },
    });
    expect(committed).toBe(true);
  });

  test("preserves canonical mutation payloads across the API adapter", async () => {
    const build = createBuild();
    const pageId = build.pages.homePageId;
    const input = {
      projectId: build.projectId,
      pageId,
      values: { name: "Updated home" },
    };
    const direct = executeBuilderRuntimeOperation({
      id: "pages.update",
      state: createBuilderRuntimeState(build),
      input,
      context: {
        createId: () => "unused",
        projectId: build.projectId,
        projectVersion: build.version,
      },
    });

    await expect(
      executeApiRuntimeOperation({ id: "pages.update", build, input })
    ).resolves.toEqual(direct);
  });

  test("strips API transport fields before strict runtime validation", async () => {
    await expect(
      executeApiRuntimeOperation({
        id: "project.search",
        build: createBuild(),
        input: { projectId: "project-1", query: "Home" },
      })
    ).resolves.toMatchObject({ query: "Home" });
  });

  test("preserves actionable validation issues in public api errors", async () => {
    await expect(
      executeApiRuntimeOperation({
        id: "pages.create",
        build: createBuild(),
        input: { projectId: "project-1", name: false, path: "/pricing" },
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      cause: expect.objectContaining({
        webstudioCode: "INVALID_INPUT",
        issues: [
          expect.objectContaining({
            path: ["name"],
            constraint: "type:string",
          }),
        ],
      }),
    } satisfies Partial<TRPCError>);
  });

  test("awaits async runtime mutations before reading mutation payload", async () => {
    const mutation = await executeApiRuntimeOperation({
      id: "instances.insertComponent",
      build: createBuild(),
      input: {
        projectId: "project-1",
        parentInstanceId: "root-1",
        component: "Form",
      },
    });

    expect(mutation).toMatchObject({
      payload: expect.arrayContaining([
        expect.objectContaining({ namespace: "instances" }),
      ]),
      result: {
        rootInstanceIds: expect.arrayContaining([expect.any(String)]),
        instanceIds: expect.arrayContaining([expect.any(String)]),
      },
    });
  });

  test("executes semantic Collection insertion through the server runtime", async () => {
    const mutation = await executeApiRuntimeOperation({
      id: "instances.insertCollection",
      build: createBuild(),
      input: {
        projectId: "project-1",
        parentInstanceId: "root-1",
        data: { type: "json", value: [{ title: "First" }] },
        itemFragment: {
          ...createEmptyWebstudioFragment(),
          children: [{ type: "id", value: "item-root" }],
          instances: [
            {
              type: "instance",
              id: "item-root",
              component: "ws:element",
              tag: "article",
              children: [],
            },
          ],
        },
      },
    });

    expect(mutation).toMatchObject({
      payload: expect.arrayContaining([
        expect.objectContaining({ namespace: "instances" }),
        expect.objectContaining({ namespace: "props" }),
        expect.objectContaining({ namespace: "dataSources" }),
      ]),
      result: {
        collectionInstanceId: expect.any(String),
        itemRootInstanceId: expect.any(String),
        itemParameterId: expect.any(String),
        itemKeyParameterId: expect.any(String),
      },
    });
  });
});
