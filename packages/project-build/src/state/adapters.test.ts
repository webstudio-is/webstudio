import { expect, test } from "vitest";
import { serializePages } from "@webstudio-is/project-migrations/pages";
import { build, pages } from "./fixtures.test-utils";
import {
  createBuilderStateFromBuildData,
  createBuilderStateFromCompactBuild,
  createBuilderStateFromSerializedSnapshot,
  createBuilderStateFromSnapshot,
  createSerializedBuilderStateSnapshotFromState,
  createBuilderStateSnapshotFromState,
  createBuilderStateFromStores,
} from "./adapters";

test("adapts snapshots without sharing mutable maps", () => {
  const state = createBuilderStateFromSnapshot(build);

  expect(state.pages?.homePageId).toBe(pages.homePageId);
  expect(state.pages?.rootFolderId).toBe(pages.rootFolderId);
  expect(state.pages?.pages).toEqual(pages.pages);
  expect(state.pages?.folders).toEqual(pages.folders);
  expect(state.pages).not.toBe(pages);
  expect(state.pages?.pages).not.toBe(pages.pages);
  expect(state.pages?.folders).not.toBe(pages.folders);
  expect(state.instances).toEqual(new Map(build.instances));
  expect(state.instances).not.toBe(build.instances);
  expect(state.instances?.get("instance-root")).not.toBe(
    build.instances[0]?.[1]
  );
});

test("adapts store boundaries without importing builder stores", () => {
  const state = createBuilderStateFromStores({
    pages: { get: () => pages },
    instances: { get: () => new Map(build.instances) },
    props: { get: () => undefined },
  });

  expect(state.pages?.pages).toEqual(pages.pages);
  expect(state.pages).not.toBe(pages);
  expect(state.pages?.pages).not.toBe(pages.pages);
  expect(state.instances).toEqual(new Map(build.instances));
  expect(state.instances?.get("instance-root")).not.toBe(
    build.instances[0]?.[1]
  );
  expect(state.props).toBeUndefined();
});

test("adapts serialized snapshots with migrated pages", () => {
  const state = createBuilderStateFromSerializedSnapshot({
    pages: {
      ...pages,
      pages: Array.from(pages.pages.values()),
      folders: Array.from(pages.folders.values()),
    },
    props: build.props,
  });

  expect(state.pages?.pages).toEqual(pages.pages);
  expect(state.pages?.folders).toEqual(pages.folders);
  expect(state.props).toEqual(new Map(build.props));
});

test("adapts array build data snapshots into normalized builder state", () => {
  const state = createBuilderStateFromBuildData({
    pages,
    instances: Array.from(new Map(build.instances).values()),
    props: Array.from(new Map(build.props).values()),
    styles: [],
    styleSources: [],
    styleSourceSelections: [],
    dataSources: [],
    resources: [],
    assets: [],
    breakpoints: [],
    marketplaceProduct: build.marketplaceProduct,
  });

  expect(state.pages?.pages).toEqual(pages.pages);
  expect(state.instances).toEqual(new Map(build.instances));
  expect(state.props).toEqual(new Map(build.props));
});

test("adapts compact build snapshots into normalized builder state", () => {
  const state = createBuilderStateFromCompactBuild({
    pages,
    instances: Array.from(new Map(build.instances).values()),
    props: Array.from(new Map(build.props).values()),
    styles: [],
    styleSources: [],
    styleSourceSelections: [],
    dataSources: [],
    resources: [],
    assets: [],
    breakpoints: [],
    marketplaceProduct: build.marketplaceProduct,
  });

  expect(state.pages?.pages).toEqual(pages.pages);
  expect(state.instances).toEqual(new Map(build.instances));
  expect(state.props).toEqual(new Map(build.props));
});

test("serializes builder state into a persisted snapshot shape", () => {
  const state = createBuilderStateFromSnapshot(build);
  const snapshot = createBuilderStateSnapshotFromState(state);

  expect(snapshot.pages).toEqual(state.pages);
  expect(snapshot.instances).toEqual(build.instances);
  expect(snapshot.props).toEqual(build.props);
});

test("serializes builder state into a JSON-safe persisted snapshot shape", () => {
  const state = createBuilderStateFromSnapshot(build);
  const snapshot = createSerializedBuilderStateSnapshotFromState(state);

  expect(snapshot.pages).toEqual(serializePages(state.pages!));
  expect(snapshot.instances).toEqual(build.instances);
});
