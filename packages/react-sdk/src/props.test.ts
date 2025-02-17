import { test, expect, describe } from "vitest";
import type { Pages, Prop } from "@webstudio-is/sdk";
import { isAttributeNameSafe, normalizeProps } from "./props";

const pagesBase: Pages = {
  meta: {},
  homePage: {
    id: "home",
    path: "",
    name: "Home",
    title: "Home",
    rootInstanceId: "instance-1",
    meta: {},
  },
  pages: [],
  folders: [
    {
      id: "root",
      name: "Root",
      slug: "",
      children: [],
    },
  ],
};

test("normalize asset prop into string", () => {
  expect(
    normalizeProps({
      props: [
        {
          id: "prop1",
          instanceId: "instance1",
          name: "src",
          type: "asset",
          value: "asset1",
        },
        {
          id: "prop-w",
          instanceId: "instance1",
          name: "width",
          type: "asset",
          value: "asset1",
        },
        {
          id: "prop-h",
          instanceId: "instance1",
          name: "height",
          type: "asset",
          value: "asset1",
        },
      ],
      assetBaseUrl: "/assets/",
      assets: new Map([
        [
          "asset1",
          {
            id: "asset1",
            type: "image",
            name: "my-asset.jpg",
            format: "jpg",
            meta: { width: 101, height: 303 },
            projectId: "",
            size: 0,
            description: "",
            createdAt: "",
          },
        ],
      ]),
      uploadingImageAssets: [],
      pages: pagesBase,
      source: "prebuild",
    })
  ).toEqual([
    {
      id: "prop1",
      instanceId: "instance1",
      name: "src",
      type: "string",
      value: "/assets/my-asset.jpg",
    },
    {
      id: "prop-w",
      instanceId: "instance1",
      name: "width",
      required: undefined,
      type: "number",
      value: 101,
    },
    {
      id: "prop-h",
      instanceId: "instance1",
      name: "height",
      required: undefined,
      type: "number",
      value: 303,
    },
  ]);
});

test("normalize asset prop into string and pass assetId on the canvas", () => {
  expect(
    normalizeProps({
      props: [
        {
          id: "prop1",
          instanceId: "instance1",
          name: "src",
          type: "asset",
          value: "asset1",
        },
        {
          id: "prop-w",
          instanceId: "instance1",
          name: "width",
          type: "asset",
          value: "asset1",
        },
        {
          id: "prop-h",
          instanceId: "instance1",
          name: "height",
          type: "asset",
          value: "asset1",
        },
      ],
      assetBaseUrl: "/assets/",
      assets: new Map([
        [
          "asset1",
          {
            id: "asset1",
            type: "image",
            name: "my-asset.jpg",
            format: "jpg",
            meta: { width: 101, height: 303 },
            projectId: "",
            size: 0,
            description: "",
            createdAt: "",
          },
        ],
      ]),
      uploadingImageAssets: [],
      pages: pagesBase,
      source: "canvas",
    })
  ).toEqual([
    {
      id: "prop1",
      instanceId: "instance1",
      name: "src",
      type: "string",
      value: "/assets/my-asset.jpg",
    },
    {
      id: "instance1-asset1-assetId",
      instanceId: "instance1",
      name: "$webstudio$canvasOnly$assetId",
      required: false,
      type: "string",
      value: "asset1",
    },
    {
      id: "prop-w",
      instanceId: "instance1",
      name: "width",
      required: undefined,
      type: "number",
      value: 101,
    },
    {
      id: "prop-h",
      instanceId: "instance1",
      name: "height",
      required: undefined,
      type: "number",
      value: 303,
    },
  ]);
});

test("normalize page prop with path into string", () => {
  expect(
    normalizeProps({
      props: [
        {
          id: "prop1",
          instanceId: "instance1",
          name: "href",
          type: "page",
          value: "page1",
        },
      ],
      assetBaseUrl: "",
      assets: new Map(),
      uploadingImageAssets: [],
      pages: {
        ...pagesBase,
        pages: [
          {
            id: "page1",
            path: "/page1",
            name: "Page",
            title: "Page",
            rootInstanceId: "instance-1",
            meta: {},
          },
        ],
        folders: [],
      },
      source: "prebuild",
    })
  ).toEqual([
    {
      id: "prop1",
      instanceId: "instance1",
      name: "href",
      type: "string",
      value: "/page1",
    },
  ]);
});

test("normalize page prop with path and hash into string", () => {
  const idProp: Prop = {
    id: "prop1",
    instanceId: "instance1",
    name: "id",
    type: "string",
    value: "my anchor",
  };
  const result = normalizeProps({
    props: [
      {
        id: "prop1",
        instanceId: "instance1",
        name: "href",
        type: "page",
        value: {
          pageId: "page1",
          instanceId: "instance1",
        },
      },
      idProp,
    ],
    assetBaseUrl: "",
    assets: new Map(),
    uploadingImageAssets: [],
    pages: {
      ...pagesBase,
      pages: [
        {
          id: "page1",
          path: "/page1",
          name: "Page",
          title: "Page",
          rootInstanceId: "instance-1",
          meta: {},
        },
      ],
      folders: [
        {
          id: "root",
          name: "Root",
          slug: "",
          children: ["folder"],
        },
        {
          id: "folder",
          name: "Folder",
          slug: "folder",
          children: ["page1"],
        },
      ],
    },
    source: "prebuild",
  });
  expect(result).toEqual([
    {
      id: "prop1",
      instanceId: "instance1",
      name: "href",
      type: "string",
      value: "/folder/page1#my%20anchor",
    },
    idProp,
  ]);
});

describe("isAttributeNameSafe", () => {
  test("should return true for valid attribute names", () => {
    expect(isAttributeNameSafe("data-test")).toBe(true);
    expect(isAttributeNameSafe("aria-label")).toBe(true);
    expect(isAttributeNameSafe("class")).toBe(true);
    expect(isAttributeNameSafe("ns:class")).toBe(true);
  });

  test("should return false for invalid attribute names", () => {
    expect(isAttributeNameSafe("123class")).toBe(false);
    expect(isAttributeNameSafe("class.name")).toBe(false);
    expect(isAttributeNameSafe(":bad")).toBe(false);
    expect(isAttributeNameSafe(" ")).toBe(false);
    expect(isAttributeNameSafe("hello world")).toBe(false);
  });

  test("should return true for cached valid attribute names", () => {
    isAttributeNameSafe("data-cached");
    expect(isAttributeNameSafe("data-cached")).toBe(true);
  });

  test("should return false for cached invalid attribute names", () => {
    isAttributeNameSafe("1-invalid-cached");
    expect(isAttributeNameSafe("1-invalid-cached")).toBe(false);
  });
});
