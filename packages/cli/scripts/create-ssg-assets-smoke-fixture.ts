import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { bundleVersion } from "@webstudio-is/protocol";
import type { AssetFileDocument } from "@webstudio-is/content-engine";
import {
  createAssetIndex,
  createCanonicalAssetFileEntry,
} from "@webstudio-is/content-engine/compiler";
import { createStructuredAssetQueryResourceBody } from "@webstudio-is/sdk";

const outputPath = process.argv[2];

if (outputPath === undefined) {
  throw new Error("Expected an output path for the SSG Assets smoke fixture.");
}

const document: AssetFileDocument = {
  _id: "post-1",
  _type: "asset.file",
  name: "hello-world.md",
  path: "blog/hello-world.md",
  key: "hello-world",
  extension: "md",
  mimeType: "text/markdown",
  size: 13,
  revision: "post-1-revision",
  contentRef: "hello-world.md",
  properties: {
    slug: "hello-world",
    title: "Hello world",
    draft: false,
  },
};

const assetIndex = await createAssetIndex({
  projectId: "ssg-assets-smoke",
  entries: [
    {
      ...createCanonicalAssetFileEntry({
        projectId: "ssg-assets-smoke",
        document,
      }),
      content: "# Hello world",
    },
  ],
});

const createQueryBody = (
  field: "draft" | "slug",
  value: "false" | "system.params.slug"
) =>
  createStructuredAssetQueryResourceBody({
    where: {
      all: [
        {
          field: ["properties", field],
          operator: "eq",
          value,
        },
      ],
    },
    sort: [],
    limit: field === "slug" ? "1" : "20",
    offset: "0",
    output: { mode: "all", includeMetadata: true },
    content: { mode: "none" },
  });

const pages = [
  {
    id: "home",
    name: "Home",
    title: "Home",
    path: "",
    rootInstanceId: "home-root",
    meta: {},
  },
  {
    id: "blog",
    name: "Blog",
    title: "Blog",
    path: "/blog/:slug",
    rootInstanceId: "blog-root",
    systemDataSourceId: "blog-system",
    meta: {},
  },
  {
    id: "post",
    name: "Post",
    title: "Post",
    path: "/posts/:slug",
    rootInstanceId: "post-root",
    systemDataSourceId: "post-system",
    meta: {},
  },
];

const data = {
  bundleVersion,
  origin: "https://assets.example",
  projectDomain: "example.com",
  projectTitle: "SSG Assets smoke fixture",
  user: { email: "owner@example.com" },
  page: pages[0],
  pages,
  assets: [
    {
      id: document._id,
      projectId: "ssg-assets-smoke",
      name: document.contentRef,
      type: "file",
      format: document.extension,
      size: document.size,
      meta: {},
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  assetIndex,
  build: {
    id: "ssg-assets-smoke-build",
    projectId: "ssg-assets-smoke",
    version: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    pages: {
      meta: { siteName: "SSG Assets smoke fixture", contactEmail: "" },
      compiler: { atomicStyles: true },
      redirects: [],
      homePageId: "home",
      rootFolderId: "root",
      pages,
      folders: [
        {
          id: "root",
          name: "Root",
          slug: "",
          children: pages.map(({ id }) => id),
        },
      ],
    },
    props: [],
    instances: [
      [
        "home-root",
        {
          type: "instance",
          id: "home-root",
          component: "Box",
          children: [],
        },
      ],
      [
        "blog-root",
        {
          type: "instance",
          id: "blog-root",
          component: "Box",
          children: [],
        },
      ],
      [
        "post-root",
        {
          type: "instance",
          id: "post-root",
          component: "Box",
          children: [],
        },
      ],
    ],
    dataSources: [
      [
        "blog-system",
        {
          id: "blog-system",
          type: "parameter",
          name: "system",
          scopeInstanceId: "blog-root",
        },
      ],
      [
        "post-system",
        {
          id: "post-system",
          type: "parameter",
          name: "system",
          scopeInstanceId: "post-root",
        },
      ],
      [
        "all-posts-data",
        {
          id: "all-posts-data",
          type: "resource",
          name: "allPosts",
          resourceId: "all-posts",
          scopeInstanceId: "blog-root",
        },
      ],
      [
        "post-data",
        {
          id: "post-data",
          type: "resource",
          name: "post",
          resourceId: "post",
          scopeInstanceId: "post-root",
        },
      ],
    ],
    resources: [
      [
        "all-posts",
        {
          id: "all-posts",
          name: "All posts",
          control: "system",
          method: "post",
          url: '"/$resources/assets"',
          headers: [],
          body: createQueryBody("draft", "false"),
        },
      ],
      [
        "post",
        {
          id: "post",
          name: "Post",
          control: "system",
          method: "post",
          url: '"/$resources/assets"',
          headers: [],
          body: createQueryBody("slug", "system.params.slug"),
        },
      ],
    ],
    styleSources: [],
    styleSourceSelections: [],
    styles: [],
    breakpoints: [],
  },
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(data), "utf8");
