import { describe, test, expect } from "@jest/globals";
import { resolveUrlProp, type Pages, type PropsByInstanceId } from "./props";
import type { Page, Prop } from "@webstudio-is/project-build";
import type { Asset, Assets } from "@webstudio-is/asset-uploader";

const unique = () => Math.random().toString();

describe("resolveUrlProp", () => {
  const instanceId = unique();
  const projectId = unique();

  const page1: Page = {
    id: unique(),
    path: `/${unique()}`,
    name: "",
    title: "",
    meta: {},
    rootInstanceId: "0",
  };

  const page2: Page = {
    id: unique(),
    path: `/${unique()}`,
    name: "",
    title: "",
    meta: {},
    rootInstanceId: "0",
  };

  const asset1: Asset = {
    id: unique(),
    name: unique(),
    type: "image",
    projectId,
    format: "png",
    size: 100000,
    createdAt: new Date().toISOString(),
    description: null,
    meta: { width: 128, height: 180 },
  };

  const assetProp: Prop = {
    type: "asset",
    id: unique(),
    instanceId,
    name: unique(),
    value: asset1.id,
  };

  const pageByIdProp: Prop = {
    type: "page",
    id: unique(),
    instanceId,
    name: unique(),
    value: page1.id,
  };

  const instnaceIdProp: Prop = {
    type: "string",
    id: unique(),
    instanceId: unique(),
    name: "id",
    value: unique(),
  };

  const pageSectionProp: Prop = {
    type: "page",
    id: unique(),
    instanceId,
    name: unique(),
    value: { pageId: page1.id, instanceId: instnaceIdProp.instanceId },
  };

  const pageByPathProp: Prop = {
    type: "string",
    id: unique(),
    instanceId,
    name: unique(),
    value: page2.path,
  };

  const arbitraryUrlProp: Prop = {
    type: "string",
    id: unique(),
    instanceId,
    name: unique(),
    value: unique(),
  };

  const props: PropsByInstanceId = new Map([
    [
      instanceId,
      [
        pageByIdProp,
        pageByPathProp,
        arbitraryUrlProp,
        assetProp,
        pageSectionProp,
      ],
    ],
    [instnaceIdProp.instanceId, [instnaceIdProp]],
  ]);

  const pages: Pages = new Map([
    [page1.id, page1],
    [page2.id, page2],
  ]);

  const assets: Assets = new Map([[asset1.id, asset1]]);

  const stores = { props, pages, assets };

  test("if instanceId is unknown returns undefined", () => {
    expect(
      resolveUrlProp("unknown", pageByIdProp.name, stores)
    ).toBeUndefined();
  });

  test("if prop name is unknown returns undefined", () => {
    expect(resolveUrlProp(instanceId, "unknown", stores)).toBeUndefined();
  });

  test("asset by id", () => {
    expect(resolveUrlProp(instanceId, assetProp.name, stores)).toEqual({
      type: "asset",
      asset: asset1,
    });
  });

  test("page by id", () => {
    expect(resolveUrlProp(instanceId, pageByIdProp.name, stores)).toEqual({
      type: "page",
      page: page1,
    });
  });

  test("page by path", () => {
    expect(resolveUrlProp(instanceId, pageByPathProp.name, stores)).toEqual({
      type: "page",
      page: page2,
    });
  });

  test("section on a page", () => {
    expect(resolveUrlProp(instanceId, pageSectionProp.name, stores)).toEqual({
      type: "page",
      page: page1,
      instanceId: instnaceIdProp.instanceId,
      hash: instnaceIdProp.value,
    });
  });

  test("arbitrary url", () => {
    expect(resolveUrlProp(instanceId, arbitraryUrlProp.name, stores)).toEqual({
      type: "string",
      url: arbitraryUrlProp.value,
    });
  });
});
