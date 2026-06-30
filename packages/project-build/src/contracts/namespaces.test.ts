import { expect, test } from "vitest";
import { builderNamespaces } from "./namespaces";

test("defines the shared builder namespace catalog", () => {
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
    "marketplaceProduct",
  ]);
});
