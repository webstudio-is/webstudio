import type { BuilderStateSnapshot } from "./adapters";

export const pages = {
  homePageId: "page-home",
  rootFolderId: "folder-root",
  meta: {},
  compiler: {},
  pages: new Map([
    [
      "page-home",
      {
        id: "page-home",
        name: "Home",
        title: "Home",
        path: "",
        rootInstanceId: "instance-root",
        meta: {},
      },
    ],
  ]),
  folders: new Map([
    [
      "folder-root",
      {
        id: "folder-root",
        name: "Root",
        slug: "",
        children: ["page-home"],
      },
    ],
  ]),
};

export const build = {
  pages,
  instances: [
    [
      "instance-root",
      {
        type: "instance",
        id: "instance-root",
        component: "Body",
        children: [],
      },
    ],
  ],
  props: [
    [
      "prop-title",
      {
        id: "prop-title",
        instanceId: "instance-root",
        name: "Title",
        type: "string",
        value: "Title",
      },
    ],
  ],
  styles: [],
  styleSources: [],
  styleSourceSelections: [],
  dataSources: [],
  resources: [],
  assets: [],
  breakpoints: [],
  marketplaceProduct: {
    category: "sectionTemplates",
    name: "Example section",
    thumbnailAssetId: "asset-thumbnail",
    author: "Webstudio",
    email: "hello@example.com",
    website: "",
    issues: "",
    description: "Example marketplace product",
  },
} as const satisfies BuilderStateSnapshot;
