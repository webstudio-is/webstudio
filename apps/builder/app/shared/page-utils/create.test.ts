import { expect, test } from "vitest";
import {
  createPageCreatePayload,
  createPageRootInstance,
  createPageValue,
} from "./create";

test("creates the default page root instance", () => {
  expect(createPageRootInstance("root")).toEqual({
    type: "instance",
    id: "root",
    component: "ws:element",
    tag: "body",
    children: [],
  });
});

test("creates a page with title defaulting to name", () => {
  expect(
    createPageValue({
      pageId: "page",
      name: "Page",
      path: "/page",
      rootInstanceId: "root",
    })
  ).toEqual({
    id: "page",
    name: "Page",
    path: "/page",
    title: "Page",
    rootInstanceId: "root",
    meta: {},
  });
});

test("creates page insertion payload", () => {
  const root = createPageRootInstance("root");
  const page = createPageValue({
    pageId: "page",
    name: "Page",
    path: "/page",
    rootInstanceId: root.id,
  });

  expect(
    createPageCreatePayload({
      page,
      parentFolderId: "folder",
      parentChildIndex: 2,
      rootInstance: root,
    })
  ).toEqual([
    {
      namespace: "pages",
      patches: [
        { op: "add", path: ["pages", "page"], value: page },
        {
          op: "add",
          path: ["folders", "folder", "children", 2],
          value: "page",
        },
      ],
    },
    {
      namespace: "instances",
      patches: [{ op: "add", path: ["root"], value: root }],
    },
  ]);
});
