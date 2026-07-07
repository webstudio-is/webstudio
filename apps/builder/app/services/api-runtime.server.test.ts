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

  test("executes runtime reads and maps runtime errors to public api errors", () => {
    const build = createBuild();

    expect(
      executeApiRuntimeOperation({
        id: "pages.list",
        build,
        input: { projectId: "project-1" },
      })
    ).toMatchObject({
      pages: [expect.objectContaining({ isHome: true })],
    });

    expect(() =>
      executeApiRuntimeOperation({
        id: "pages.get",
        build,
        input: { pageId: "missing" },
      })
    ).toThrow("Page not found");
  });
});
