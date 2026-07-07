import { expect, test } from "vitest";
import { build, pages } from "./fixtures.test-utils";
import {
  getLoadedBuilderStateNamespaces,
  getMissingBuilderStateNamespaces,
  hasBuilderStateNamespaces,
  type BuilderState,
} from "./builder-state";

test("reports loaded builder state namespaces", () => {
  expect(
    getLoadedBuilderStateNamespaces({
      pages,
      instances: new Map(build.instances),
    })
  ).toEqual(["pages", "instances"]);
});

test("reports missing builder state namespaces", () => {
  const state: BuilderState = { pages, instances: new Map(build.instances) };

  expect(getMissingBuilderStateNamespaces(state, ["pages", "props"])).toEqual([
    "props",
  ]);
});

test("detects when required builder state namespaces are loaded", () => {
  const state: BuilderState = { pages, instances: new Map(build.instances) };

  expect(hasBuilderStateNamespaces(state, ["pages", "instances"])).toBe(true);
  expect(hasBuilderStateNamespaces(state, ["pages", "props"])).toBe(false);
});
