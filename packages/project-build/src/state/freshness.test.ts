import { expect, test } from "vitest";
import { build, pages } from "./fixtures.test-utils";
import type { BuilderState } from "./builder-state";
import {
  createBuilderStateFreshness,
  getBuilderStateNamespacesByStatus,
  getBuilderStateNamespaceFreshness,
  markBuilderStateNamespacesInvalidated,
  markBuilderStateNamespacesStale,
} from "./freshness";

test("reports missing, fresh, stale, and invalidated namespaces", () => {
  const state: BuilderState = { pages, instances: new Map(build.instances) };
  const freshness = createBuilderStateFreshness({
    state,
    version: 3,
    staleNamespaces: ["instances"],
  });

  expect(getBuilderStateNamespacesByStatus(freshness, "fresh")).toEqual([
    "pages",
  ]);
  expect(getBuilderStateNamespacesByStatus(freshness, "stale")).toEqual([
    "instances",
  ]);
  expect(getBuilderStateNamespacesByStatus(freshness, "missing")).toContain(
    "props"
  );

  const stale = markBuilderStateNamespacesStale(freshness, ["pages"]);
  expect(getBuilderStateNamespacesByStatus(stale, "stale")).toEqual([
    "pages",
    "instances",
  ]);
  expect(markBuilderStateNamespacesStale(stale, ["props"]).props).toEqual({
    status: "missing",
  });

  const invalidated = markBuilderStateNamespacesInvalidated(
    stale,
    ["pages"],
    "tx-1"
  );
  expect(invalidated.pages).toEqual({
    status: "invalidated",
    version: 3,
    invalidatedBy: "tx-1",
  });
  expect(
    markBuilderStateNamespacesInvalidated(invalidated, ["props"], "tx-1").props
  ).toEqual({ status: "missing" });

  expect(markBuilderStateNamespacesStale(invalidated, ["pages"]).pages).toEqual(
    {
      status: "stale",
      version: 3,
    }
  );
  expect(markBuilderStateNamespacesInvalidated(stale, ["pages"]).pages).toEqual(
    {
      status: "invalidated",
      version: 3,
    }
  );
});

test("does not share mutable missing freshness objects", () => {
  const first = getBuilderStateNamespaceFreshness({}, "pages");
  first.status = "fresh";

  expect(getBuilderStateNamespaceFreshness({}, "pages")).toEqual({
    status: "missing",
  });

  const freshness = createBuilderStateFreshness({ state: {} });
  expect(freshness.pages).not.toBe(freshness.instances);
});
