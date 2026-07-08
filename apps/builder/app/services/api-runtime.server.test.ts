import { describe, expect, test } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { CompactBuild } from "@webstudio-is/project-build";
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
    instances: [{ type: "instance", id: "root-1", component: "Body" }],
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
});
