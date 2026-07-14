import { expect, test } from "vitest";
import { builderNamespaces, webstudioDataNamespaces } from "./namespaces";

test("defines the shared builder namespace catalog", () => {
  expect(webstudioDataNamespaces).toEqual([
    "pages",
    "instances",
    "props",
    "styles",
    "styleSources",
    "styleSourceSelections",
    "dataSources",
    "resources",
    "assets",
    "breakpoints",
  ]);
  expect(builderNamespaces).toEqual([
    "pages",
    "instances",
    "props",
    "styles",
    "styleSources",
    "styleSourceSelections",
    "dataSources",
    "resources",
    "assets",
    "breakpoints",
    "projectSettings",
    "marketplaceProduct",
  ]);
});
