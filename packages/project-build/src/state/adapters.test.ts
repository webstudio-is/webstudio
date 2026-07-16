import { expect, test } from "vitest";
import { serializePages } from "@webstudio-is/project-migrations/pages";
import { build, pages } from "./fixtures.test-utils";
import {
  createBuilderBuildDataSnapshotFromState,
  createBuilderStateFromBuildData,
  createBuilderStateFromCompactBuild,
  createBuilderStateFromSerializedSnapshot,
  createBuilderStateFromSnapshot,
  createSerializedBuilderStateSnapshotFromState,
  createBuilderStateSnapshotFromState,
  createSerializedBuilderBuildDataFromState,
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
  expect(state.projectSettings).toEqual({
    meta: pages.meta ?? {},
    compiler: pages.compiler ?? {},
  });
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
  expect(state.projectSettings?.meta).toEqual(pages.meta ?? {});
});

test("prefers the first-class project settings namespace over legacy pages metadata", () => {
  const state = createBuilderStateFromSnapshot({
    pages,
    projectSettings: {
      meta: { agentInstructions: "Use components." },
      compiler: { atomicStyles: false },
    },
  });

  expect(state.projectSettings).toEqual({
    meta: { agentInstructions: "Use components." },
    compiler: { atomicStyles: false },
  });
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

test("serializes builder state into detached array build data", () => {
  const state = createBuilderStateFromSnapshot(build);
  const snapshot = createBuilderBuildDataSnapshotFromState(state);

  expect(snapshot.pages).toEqual(state.pages);
  expect(snapshot.instances).toEqual(
    Array.from(state.instances?.values() ?? [])
  );
  expect(snapshot.props).toEqual(Array.from(state.props?.values() ?? []));
  expect(snapshot.instances?.[0]).not.toBe(
    state.instances?.values().next().value
  );
});

test("serializes builder state into a JSON-safe persisted snapshot shape", () => {
  const state = createBuilderStateFromSnapshot(build);
  const snapshot = createSerializedBuilderStateSnapshotFromState(state);

  expect(snapshot.pages).toEqual(serializePages(state.pages!));
  expect(snapshot.instances).toEqual(build.instances);
});

test("serializes complete build data with defaults for unloaded maps", () => {
  const state = createBuilderStateFromSnapshot({ pages });
  const buildData = createSerializedBuilderBuildDataFromState(state);

  expect(buildData.pages).toEqual(serializePages(state.pages!));
  expect(buildData.instances).toEqual([]);
  expect(buildData.props).toEqual([]);
  expect(buildData.breakpoints).toEqual([]);
});
