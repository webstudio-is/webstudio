import { test, expect } from "@jest/globals";
import type { Pages, Prop } from "@webstudio-is/sdk";
import { normalizeProps } from "./props";

const pagesBase: Pages = {
  meta: {},
  homePage: {
    id: "home",
    path: "/",
    name: "Home",
    title: "Home",
    rootInstanceId: "instance-1",
    systemDataSourceId: "",
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
            systemDataSourceId: "",
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
          systemDataSourceId: "",
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
