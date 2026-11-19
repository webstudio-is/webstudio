import { expect, test } from "vitest";
import type { Asset, AssetFolders } from "@webstudio-is/sdk";
import { createAssetUrlsByPath } from "./asset-urls";

const asset = ({
  id,
  name,
  filename,
  folderId,
  type = "file",
}: {
  id: string;
  name: string;
  filename?: string;
  folderId?: string;
  type?: Asset["type"];
}) =>
  ({
    id,
    name,
    filename,
    folderId,
    projectId: "project",
    type,
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
    asset({
      id: "hero",
      name: "hero_hash.png",
      filename: "Hero image",
      type: "image",
    }),
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
      getUrl: (item) =>
        item.type === "image"
          ? `/cgi/image/${item.name}?format=raw`
          : `/cgi/asset/${item.name}?format=raw`,
    })
  ).toEqual({
    "/Hero%20image.png": "/cgi/image/hero_hash.png?format=raw",
    "/Custom%20scripts/test.js": "/cgi/asset/test_hash.js?format=raw",
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

test("maps video assets that use the CGI asset route", () => {
  expect(
    createAssetUrlsByPath({
      assets: [
        asset({
          id: "video",
          name: "clip_hash.mp4",
          filename: "clip",
          type: "video",
        }),
      ],
      assetFolders: new Map(),
      getUrl: (item) => `/assets/${item.name}`,
    })
  ).toMatchObject({
    "/cgi/asset/clip_hash.mp4": "/assets/clip_hash.mp4",
  });
});

test("keeps a CGI alias when a stored asset is duplicated", () => {
  expect(
    createAssetUrlsByPath({
      assets: [
        asset({ id: "first", name: "app_hash.js", filename: "app" }),
        asset({ id: "copy", name: "app_hash.js", filename: "app copy" }),
      ],
      assetFolders: new Map(),
      getUrl: (item) => `/assets/${item.name}`,
    })
  ).toMatchObject({
    "/cgi/asset/app_hash.js": "/assets/app_hash.js",
  });
});

test("rewrites CGI URLs for a custom generated asset base", () => {
  expect(
    createAssetUrlsByPath({
      assets: [asset({ id: "script", name: "app_hash.js", filename: "app" })],
      assetFolders: new Map(),
      getUrl: (item) => `/media/${item.name}`,
    })
  ).toMatchObject({
    "/cgi/asset/app_hash.js": "/media/app_hash.js",
  });
});

test("keeps a canonical path when it equals the CGI asset path", () => {
  const folders: AssetFolders = new Map([
    [
      "cgi",
      {
        id: "cgi",
        projectId: "project",
        name: "cgi",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    [
      "asset",
      {
        id: "asset",
        projectId: "project",
        name: "asset",
        parentId: "cgi",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  ]);

  expect(
    createAssetUrlsByPath({
      assets: [
        asset({
          id: "script",
          name: "app_hash.js",
          filename: "app_hash",
          folderId: "asset",
        }),
      ],
      assetFolders: folders,
      getUrl: (item) => `/media/${item.name}`,
    })
  ).toEqual({
    "/cgi/asset/app_hash.js": "/media/app_hash.js",
  });
});

test("omits a CGI path that points to different asset URLs", () => {
  const assetUrlsByPath = createAssetUrlsByPath({
    assets: [
      asset({ id: "first", name: "app_hash.js", filename: "first" }),
      asset({ id: "second", name: "app_hash.js", filename: "second" }),
    ],
    assetFolders: new Map(),
    getUrl: (item) => `/${item.id}/${item.name}`,
  });

  expect(assetUrlsByPath).not.toHaveProperty("/cgi/asset/app_hash.js");
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
