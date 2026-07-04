import { expect, test } from "vitest";
import {
  createImageAssetFixture,
  createSerializedBuildFixture,
} from "@webstudio-is/protocol/fixtures";
import { migratePages } from "@webstudio-is/project-migrations/pages";
import { __testing__ } from "./canvas.server";

const { serializeProjectBundle } = __testing__;

test("serializes dev builds into project bundles without requiring deployment", () => {
  const serializedBuild = createSerializedBuildFixture();
  const build = {
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
    marketplaceProduct: undefined,
  } as unknown as Parameters<typeof serializeProjectBundle>[0]["build"];
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
