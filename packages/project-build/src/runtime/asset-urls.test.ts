import { expect, test } from "vitest";
import type { Asset, AssetFolders } from "@webstudio-is/sdk";
import { createAssetUrlsByPath } from "./asset-urls";

const asset = ({
  id,
  name,
  filename,
  folderId,
}: {
  id: string;
  name: string;
  filename?: string;
  folderId?: string;
}) =>
  ({
    id,
    name,
    filename,
    folderId,
    projectId: "project",
    type: "file",
    size: 1,
    format: name.slice(name.lastIndexOf(".") + 1),
    createdAt: "2026-01-01T00:00:00.000Z",
    description: null,
    meta: {},
  }) as Asset;

test("creates runtime URLs keyed by root-relative asset paths", () => {
  const folders: AssetFolders = new Map([
    [
      "scripts",
      {
        id: "scripts",
        projectId: "project",
        name: "Custom scripts",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  ]);
  const assets = [
    asset({ id: "hero", name: "hero_hash.png", filename: "Hero image" }),
    asset({
      id: "script",
      name: "test_hash.js",
      filename: "test",
      folderId: "scripts",
    }),
  ];

  expect(
    createAssetUrlsByPath({
      assets,
      assetFolders: folders,
      getUrl: (item) => `/cgi/asset/${item.name}`,
    })
  ).toEqual({
    "/Hero%20image.png": "/cgi/asset/hero_hash.png",
    "/Custom%20scripts/test.js": "/cgi/asset/test_hash.js",
    "/cgi/asset/hero_hash.png": "/cgi/asset/hero_hash.png",
    "/cgi/asset/test_hash.js": "/cgi/asset/test_hash.js",
  });
});

test("resolves published CGI asset URLs by the stored asset name", () => {
  expect(
    createAssetUrlsByPath({
      assets: [
        asset({
          id: "script",
          name: "dashboard_hash.js",
          filename: "dashboard",
        }),
      ],
      assetFolders: new Map(),
      getUrl: (item) => `/assets/${item.name}`,
    })
  ).toMatchObject({
    "/cgi/asset/dashboard_hash.js": "/assets/dashboard_hash.js",
  });
});

test("omits ambiguous canonical paths but keeps unique CGI URLs", () => {
  const assets = [
    asset({ id: "first", name: "first_hash.js", filename: "test" }),
    asset({ id: "second", name: "second_hash.js", filename: "test" }),
  ];

  expect(
    createAssetUrlsByPath({
      assets,
      assetFolders: new Map(),
      getUrl: (item) => `/assets/${item.name}`,
    })
  ).toEqual({
    "/cgi/asset/first_hash.js": "/assets/first_hash.js",
    "/cgi/asset/second_hash.js": "/assets/second_hash.js",
  });
});
