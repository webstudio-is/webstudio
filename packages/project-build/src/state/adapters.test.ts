import { expect, test } from "vitest";
import { build, pages } from "./fixtures.test-utils";
import {
  createBuilderStateFromSerializedSnapshot,
  createBuilderStateFromSnapshot,
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
