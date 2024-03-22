import { fileURLToPath } from "node:url";
import type { Page } from "@webstudio-is/sdk";
export type PageSource = Page;
export type PageMetaSource = Page["meta"];
export type PageMetaCustomSource = NonNullable<
  PageMetaSource["custom"]
>[number];

import { objectType, inputObjectType, extendType, arg } from "nexus";

const PageMetaCustom = objectType({
  name: "PageMetaCustom",
  sourceType: {
    module: fileURLToPath(import.meta.url),
    export: "PageMetaCustomSource",
  },

  definition(t) {
    t.string("property");
    t.string("content");
  },
});

const PageMeta = objectType({
  name: "PageMeta",
  sourceType: {
    module: fileURLToPath(import.meta.url),
    export: "PageMetaSource",
  },

  definition(t) {
    t.string("description");
    t.string("title");
    t.boolean("excludePageFromSearch");
    t.string("socialImageAssetId");

    t.list.field("custom", {
      type: PageMetaCustom,
      resolve(_root) {
        return _root.custom ?? null;
      },
    });
  },
});

const Page = objectType({
  name: "Page",
  sourceType: {
    module: fileURLToPath(import.meta.url),
    export: "PageSource",
  },
  definition(t) {
    t.nonNull.id("id");
    t.nonNull.string("name");
    t.nonNull.string("title");
    t.nonNull.string("path");

    t.field("meta", {
      type: PageMeta,
      resolve(_root) {
        return _root.meta;
      },
    });
  },
});

export const PagesQuery = extendType({
  type: "Query",

  definition(t) {
    t.nonNull.list.field("pages", {
      type: Page,
      args: {
        where: arg({
          type: inputObjectType({
            name: "PageInputMetaWhere",
            definition(t) {
              t.string("property");
              t.list.string("in");
              t.string("eq");
            },
          }),
        }),
      },

      resolve(_root, args) {
        return _root.pages;
      },
    });
  },
});
