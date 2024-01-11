import { test, expect } from "@jest/globals";
import type { Prop } from "@webstudio-is/sdk";
import { normalizeProps } from "./props";

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
      pages: new Map(),
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
          value: "page1Id",
        },
      ],
      assetBaseUrl: "",
      assets: new Map(),
      pages: new Map([
        [
          "page1Id",
          {
            id: "page1Id",
            path: "page1",
            rootInstanceId: "",
            name: "",
            title: "",
            meta: {},
          },
        ],
      ]),
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
  expect(
    normalizeProps({
      props: [
        {
          id: "prop1",
          instanceId: "instance1",
          name: "href",
          type: "page",
          value: {
            pageId: "page1Id",
            instanceId: "instance1",
          },
        },
        idProp,
      ],
      assetBaseUrl: "",
      assets: new Map(),
      pages: new Map([
        [
          "page1Id",
          {
            id: "page1Id",
            path: "page1",
            rootInstanceId: "",
            name: "",
            title: "",
            meta: {},
          },
        ],
      ]),
    })
  ).toEqual([
    {
      id: "prop1",
      instanceId: "instance1",
      name: "href",
      type: "string",
      value: "/page1#my%20anchor",
    },
    idProp,
  ]);
});
