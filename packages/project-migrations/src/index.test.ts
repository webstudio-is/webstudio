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
    meta: undefined,
    compiler: undefined,
    redirects: undefined,
    homePageId: "homePageId",
    rootFolderId: "root",
    pages: new Map([
      ["homePageId", expect.objectContaining({ id: "homePageId" })],
      ["pageId", expect.objectContaining({ id: "pageId" })],
    ]),
    pageTemplates: new Map(),
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

test("moves legacy Code Text properties into text content", () => {
  const data = structuredClone(emptyData);
  data.instances.set("literal", {
    type: "instance",
    id: "literal",
    component: "CodeText",
    children: [{ type: "text", value: "ignored legacy child" }],
  });
  data.instances.set("bound", {
    type: "instance",
    id: "bound",
    component: "CodeText",
    children: [],
  });
  data.props.set("literal-code", {
    id: "literal-code",
    instanceId: "literal",
    name: "code",
    type: "string",
    value: "const answer = 42;",
  });
  data.props.set("bound-code", {
    id: "bound-code",
    instanceId: "bound",
    name: "code",
    type: "expression",
    value: "$ws$dataSource$code",
  });

  migrateWebstudioDataMutable(data);
  migrateWebstudioDataMutable(data);

  expect(data.instances.get("literal")?.children).toEqual([
    { type: "text", value: "const answer = 42;" },
  ]);
  expect(data.instances.get("bound")?.children).toEqual([
    { type: "expression", value: "$ws$dataSource$code" },
  ]);
  expect(Array.from(data.props.values())).toEqual([]);
});

test("removes redundant Code Text defaults and preserves custom selections", () => {
  const data = structuredClone(emptyData);
  data.instances.set("defaults", {
    type: "instance",
    id: "defaults",
    component: "CodeText",
    children: [],
  });
  data.instances.set("custom", {
    type: "instance",
    id: "custom",
    component: "CodeText",
    children: [],
  });
  data.props.set("default-language", {
    id: "default-language",
    instanceId: "defaults",
    name: "language",
    type: "string",
    value: "javascript",
  });
  data.props.set("default-theme", {
    id: "default-theme",
    instanceId: "defaults",
    name: "theme",
    type: "string",
    value: "github-light",
  });
  data.props.set("custom-language", {
    id: "custom-language",
    instanceId: "custom",
    name: "language",
    type: "string",
    value: "css",
  });
  data.props.set("custom-theme", {
    id: "custom-theme",
    instanceId: "custom",
    name: "theme",
    type: "string",
    value: "nord",
  });

  migrateWebstudioDataMutable(data);
  migrateWebstudioDataMutable(data);

  expect(Array.from(data.props.values())).toEqual([
    expect.objectContaining({ name: "language", value: "css" }),
    expect.objectContaining({ name: "theme", value: "nord" }),
  ]);
});

test("removes the legacy local styles from Content Block Image templates", () => {
  const data = structuredClone(emptyData);
  data.instances.set("templates", {
    type: "instance",
    id: "templates",
    component: "ws:block-template",
    children: [{ type: "id", value: "image" }],
  });
  data.instances.set("image", {
    type: "instance",
    id: "image",
    component: "Image",
    children: [],
  });
  data.styleSources.set("image-local", {
    type: "local",
    id: "image-local",
  });
  data.styleSources.set("custom-local", {
    type: "local",
    id: "custom-local",
  });
  data.styleSourceSelections.set("image", {
    instanceId: "image",
    values: ["image-local", "custom-local"],
  });
  for (const [property, value] of [
    ["marginRight", { type: "keyword", value: "auto" }],
    ["marginLeft", { type: "keyword", value: "auto" }],
    ["width", { type: "unit", unit: "%", value: 100 }],
    ["height", { type: "keyword", value: "auto" }],
  ] as const) {
    data.styles.set(`image-local:base:${property}:`, {
      breakpointId: "base",
      styleSourceId: "image-local",
      property,
      value,
    });
  }
  data.styles.set("custom-local:base:color:", {
    breakpointId: "base",
    styleSourceId: "custom-local",
    property: "color",
    value: { type: "keyword", value: "red" },
  });

  migrateWebstudioDataMutable(data);
  migrateWebstudioDataMutable(data);

  expect(data.styleSourceSelections.get("image")?.values).toEqual([
    "custom-local",
  ]);
  expect(data.styleSources.has("image-local")).toBe(false);
  expect(data.styleSources.has("custom-local")).toBe(true);
  expect(Array.from(data.styles.values())).toEqual([
    expect.objectContaining({ styleSourceId: "custom-local" }),
  ]);
});
