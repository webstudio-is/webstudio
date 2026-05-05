import { expect, test } from "vitest";
import type { StyleProperty } from "@webstudio-is/css-engine";
import type { Pages, WebstudioData } from "@webstudio-is/sdk";
import { migrateWebstudioDataMutable } from "./index";

const emptyData: WebstudioData = {
  pages: {
    homePageId: "homePageId",
    rootFolderId: "root",
    pages: new Map([
      [
        "homePageId",
        {
          id: "homePageId",
          name: "Home",
          path: "",
          title: `"Home"`,
          meta: {},
          rootInstanceId: "rootInstanceId",
        },
      ],
    ]),
    folders: new Map([
      [
        "root",
        {
          id: "root",
          name: "Root",
          slug: "",
          children: ["homePageId"],
        },
      ],
    ]),
  },
  assets: new Map(),
  dataSources: new Map(),
  resources: new Map(),
  instances: new Map(),
  props: new Map(),
  breakpoints: new Map(),
  styleSources: new Map(),
  styleSourceSelections: new Map(),
  styles: new Map(),
};

test("migrates legacy pages inside webstudio data", () => {
  const data = structuredClone(emptyData);
  data.pages = {
    homePage: {
      id: "homePageId",
      name: "Home",
      path: "",
      title: `"Home"`,
      meta: {},
      rootInstanceId: "rootInstanceId",
    },
    pages: [
      {
        id: "pageId",
        name: "Page",
        path: "/page",
        title: `"Page"`,
        meta: {},
        rootInstanceId: "pageRootInstanceId",
      },
    ],
    folders: [
      {
        id: "root",
        name: "Root",
        slug: "",
        children: [],
      },
    ],
  } as unknown as Pages;

  migrateWebstudioDataMutable(data);

  expect(data.pages).toEqual({
    homePageId: "homePageId",
    rootFolderId: "root",
    pages: new Map([
      ["homePageId", expect.objectContaining({ id: "homePageId" })],
      ["pageId", expect.objectContaining({ id: "pageId" })],
    ]),
    folders: new Map([
      [
        "root",
        {
          id: "root",
          name: "Root",
          slug: "",
          children: ["homePageId", "pageId"],
        },
      ],
    ]),
  });
});

test("migrates styles inside webstudio data", () => {
  const data = structuredClone(emptyData);
  data.styles.set("base:local:overflow::hover", {
    breakpointId: "base",
    styleSourceId: "local",
    state: ":hover",
    property: "overflow" as StyleProperty,
    value: {
      type: "tuple",
      value: [
        { type: "keyword", value: "auto" },
        { type: "keyword", value: "hidden" },
      ],
    },
  });

  migrateWebstudioDataMutable(data);

  expect(Array.from(data.styles.values())).toEqual([
    {
      breakpointId: "base",
      property: "overflowX",
      state: ":hover",
      styleSourceId: "local",
      value: { type: "keyword", value: "auto" },
    },
    {
      breakpointId: "base",
      property: "overflowY",
      state: ":hover",
      styleSourceId: "local",
      value: { type: "keyword", value: "hidden" },
    },
  ]);
});
