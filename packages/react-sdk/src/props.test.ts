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
            meta: { width: 0, height: 0 },
            projectId: "",
            size: 0,
            description: "",
            createdAt: "",
          },
        ],
      ]),
      pages: pagesBase,
    })
  ).toEqual([
    {
      id: "prop1",
      instanceId: "instance1",
      name: "src",
      type: "string",
      value: "/assets/my-asset.jpg",
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
