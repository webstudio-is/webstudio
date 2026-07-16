import { expect, test } from "vitest";
import {
  builderNamespaces,
  pageCopyNamespaces,
  webstudioDataNamespaces,
} from "./namespaces";

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
    "assetFolders",
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
    "assetFolders",
    "breakpoints",
    "projectSettings",
    "marketplaceProduct",
  ]);
  expect(pageCopyNamespaces).not.toContain("assetFolders");
  expect(new Set(pageCopyNamespaces)).toEqual(
    new Set(
      webstudioDataNamespaces.filter(
        (namespace) => namespace !== "assetFolders"
      )
    )
  );
});
