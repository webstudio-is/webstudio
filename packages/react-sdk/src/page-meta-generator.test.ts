import { expect, test } from "@jest/globals";
import { generatePageMeta } from "./page-meta-generator";
import { createScope } from "@webstudio-is/sdk";

test("generate minimal static page meta factory", () => {
  expect(
    generatePageMeta({
      scope: createScope(),
      page: {
        id: "",
        name: "",
        path: "",
        rootInstanceId: "",
        title: `"Page title"`,
        meta: {},
      },
      dataSources: new Map(),
    })
  ).toMatchInlineSnapshot(`
"export const getPageMeta = ({}: {
  params: Record<string, undefined | string>;
  resources: Record<string, any>;
}): PageMeta => {
  return {
    title: "Page title",
    description: undefined,
    excludePageFromSearch: undefined,
    socialImageAssetId: undefined,
    socialImageUrl: undefined,
    custom: [
    ],
  };
};
"
`);
});

test("generate complete static page meta factory", () => {
  expect(
    generatePageMeta({
      scope: createScope(),
      page: {
        id: "",
        name: "",
        path: "",
        rootInstanceId: "",
        title: `"Page title"`,
        meta: {
          description: `"Page description"`,
          excludePageFromSearch: "true",
          socialImageAssetId: "social-image-name",
          custom: [
            { property: "custom-property-1", content: `"custom content 1"` },
            { property: "custom-property-2", content: `"custom content 2"` },
          ],
        },
      },
      dataSources: new Map(),
    })
  ).toMatchInlineSnapshot(`
"export const getPageMeta = ({}: {
  params: Record<string, undefined | string>;
  resources: Record<string, any>;
}): PageMeta => {
  return {
    title: "Page title",
    description: "Page description",
    excludePageFromSearch: true,
    socialImageAssetId: "social-image-name",
    socialImageUrl: undefined,
    custom: [
      {
        property: "custom-property-1",
        content: "custom content 1",
      },
      {
        property: "custom-property-2",
        content: "custom content 2",
      },
    ],
  };
};
"
`);
});

test("generate asset url instead of id", () => {
  expect(
    generatePageMeta({
      scope: createScope(),
      page: {
        id: "",
        name: "",
        path: "",
        rootInstanceId: "",
        title: `"Page title"`,
        meta: {
          socialImageUrl: `"https://my-image"`,
        },
      },
      dataSources: new Map(),
    })
  ).toMatchInlineSnapshot(`
"export const getPageMeta = ({}: {
  params: Record<string, undefined | string>;
  resources: Record<string, any>;
}): PageMeta => {
  return {
    title: "Page title",
    description: undefined,
    excludePageFromSearch: undefined,
    socialImageAssetId: undefined,
    socialImageUrl: "https://my-image",
    custom: [
    ],
  };
};
"
`);
});

test("generate custom meta ignoring empty property name", () => {
  expect(
    generatePageMeta({
      scope: createScope(),
      page: {
        id: "",
        name: "",
        path: "",
        rootInstanceId: "",
        title: `"Page title"`,
        meta: {
          custom: [
            { property: "custom-property", content: `"custom content 1"` },
            { property: "", content: `"custom content 2"` },
          ],
        },
      },
      dataSources: new Map(),
    })
  ).toMatchInlineSnapshot(`
"export const getPageMeta = ({}: {
  params: Record<string, undefined | string>;
  resources: Record<string, any>;
}): PageMeta => {
  return {
    title: "Page title",
    description: undefined,
    excludePageFromSearch: undefined,
    socialImageAssetId: undefined,
    socialImageUrl: undefined,
    custom: [
      {
        property: "custom-property",
        content: "custom content 1",
      },
    ],
  };
};
"
`);
});
