import { expect, test } from "@jest/globals";
import { generatePageMeta } from "./page-meta-generator";

test("generate minimal static page meta factory", () => {
  expect(
    generatePageMeta({
      page: {
        id: "",
        name: "",
        path: "",
        rootInstanceId: "",
        title: "Page title",
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
      page: {
        id: "",
        name: "",
        path: "",
        rootInstanceId: "",
        title: "Page title",
        meta: {
          description: "Page description",
          excludePageFromSearch: true,
          socialImageAssetId: "social-image-name",
          custom: [
            { property: "custom-property-1", content: "custom content 1" },
            { property: "custom-property-2", content: "custom content 2" },
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

test("generate custom meta ignoring empty property name", () => {
  expect(
    generatePageMeta({
      page: {
        id: "",
        name: "",
        path: "",
        rootInstanceId: "",
        title: "Page title",
        meta: {
          custom: [
            { property: "custom-property", content: "custom content 1" },
            { property: "", content: "custom content 2" },
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
