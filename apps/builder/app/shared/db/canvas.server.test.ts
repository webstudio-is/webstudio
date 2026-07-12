import { expect, test, vi } from "vitest";
import type { Asset } from "@webstudio-is/sdk";
import type { StyleValue } from "@webstudio-is/css-engine";
import {
  createImageAssetFixture,
  createPublishedProjectBundleFixture,
  createSerializedBuildFixture,
} from "@webstudio-is/protocol/fixtures";
import { migratePages } from "@webstudio-is/project-migrations/pages";
import { __testing__ } from "./canvas.server";

const { createLoadPublishedProjectBundleByProjectId, serializeProjectBundle } =
  __testing__;
type BundleBuild = Parameters<typeof serializeProjectBundle>[0]["build"];

const createBundleBuild = (
  overrides: Partial<BundleBuild> = {}
): BundleBuild => {
  const serializedBuild = createSerializedBuildFixture();
  return {
    ...serializedBuild,
    pages: migratePages(serializedBuild.pages),
    breakpoints: [],
    styles: [],
    styleSources: [],
    styleSourceSelections: [],
    props: [],
    instances: [],
    dataSources: [],
    resources: [],
    deployment: undefined,
    marketplaceProduct: {
      category: "pageTemplates",
      name: "Test product",
      thumbnailAssetId: "asset-id",
      author: "Author",
      email: "author@example.com",
      description: "Description",
    },
    projectSettings: { meta: {}, compiler: {} },
    ...overrides,
  };
};

test("serializes dev builds into project bundles without requiring deployment", () => {
  const build = createBundleBuild();
  const asset = createImageAssetFixture({ projectId: build.projectId });

  const bundle = serializeProjectBundle({
    build,
    assets: [asset],
  });

  expect(bundle.build.id).toBe(build.id);
  expect(bundle.build.deployment).toBeUndefined();
  expect(bundle.page.path).toBe("");
  expect(bundle.assets).toEqual([asset]);
});

test("keeps font assets referenced from nested style values", () => {
  const build = createBundleBuild({
    styles: [
      {
        styleSourceId: "token",
        breakpointId: "base",
        property: "fontFamily",
        value: {
          type: "layers",
          value: [
            {
              type: "fontFamily",
              value: ["TokenFont", "sans-serif"],
            },
          ],
        } as unknown as StyleValue,
      },
    ],
  });
  const fontAsset: Asset = {
    id: "font-asset",
    projectId: build.projectId,
    name: "TokenFont.woff2",
    type: "font",
    createdAt: "2024-01-01T00:00:00.000Z",
    format: "woff2",
    size: 100,
    meta: { family: "TokenFont", style: "normal", weight: 400 },
  };

  const bundle = serializeProjectBundle({
    build,
    assets: [fontAsset],
  });

  expect(bundle.assets).toEqual([fontAsset]);
});

test("loads project-id bundles from the published build", async () => {
  const data = createPublishedProjectBundleFixture();
  const project = {
    id: "project-id",
    latestBuildVirtual: { buildId: "published-build-id" },
  } as never;
  const context = { context: true } as never;
  const loadProductionCanvasDataAndProject = vi.fn().mockResolvedValue({
    data,
    project,
  });
  const addProjectMetadata = vi.fn().mockResolvedValue(data);
  const loadProjectById = vi.fn().mockResolvedValue(project);
  const loadPublishedProjectBundleByProjectId =
    createLoadPublishedProjectBundleByProjectId({
      addProjectMetadata,
      loadProductionCanvasDataAndProject,
      loadProjectById,
    });

  await expect(
    loadPublishedProjectBundleByProjectId("project-id", context)
  ).resolves.toBe(data);

  expect(loadProjectById).toHaveBeenCalledWith("project-id", context);
  expect(loadProductionCanvasDataAndProject).toHaveBeenCalledWith(
    "published-build-id",
    context,
    project
  );
  expect(addProjectMetadata).toHaveBeenCalledWith(data, project, context);
});

test("rejects project-id bundle loads for unpublished projects", async () => {
  const loadPublishedProjectBundleByProjectId =
    createLoadPublishedProjectBundleByProjectId({
      addProjectMetadata: vi.fn(),
      loadProductionCanvasDataAndProject: vi.fn(),
      loadProjectById: vi
        .fn()
        .mockResolvedValue({ latestBuildVirtual: null } as never),
    });

  await expect(
    loadPublishedProjectBundleByProjectId("project-id", {} as never)
  ).rejects.toThrow("The project is not published yet");
});
