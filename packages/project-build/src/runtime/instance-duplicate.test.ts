import { expect, test } from "vitest";
import {
  getStyleDeclKey,
  type Instance,
  type StyleDecl,
  type WebstudioData,
} from "@webstudio-is/sdk";
import {
  duplicateInstanceAfterItself,
  duplicateInstanceAfterItselfMutable,
} from "./instance-duplicate";

const createInstance = (
  id: Instance["id"],
  children: Instance["children"] = []
): Instance => ({
  type: "instance",
  id,
  component: "Box",
  children,
});

const createData = (): Omit<WebstudioData, "pages"> => ({
  assets: new Map(),
  breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
  dataSources: new Map(),
  instances: new Map([
    [
      "parent",
      createInstance("parent", [
        { type: "id", value: "source" },
        { type: "id", value: "sibling" },
      ]),
    ],
    ["source", createInstance("source", [{ type: "id", value: "child" }])],
    ["child", createInstance("child")],
    ["sibling", createInstance("sibling")],
  ]),
  props: new Map(),
  resources: new Map(),
  styles: new Map(),
  styleSources: new Map(),
  styleSourceSelections: new Map(),
});

const createWebstudioData = (): WebstudioData => ({
  ...createData(),
  pages: {
    homePageId: "home",
    rootFolderId: "root",
    pages: new Map([
      [
        "home",
        {
          id: "home",
          name: "Home",
          path: "",
          title: "Home",
          rootInstanceId: "parent",
          meta: {},
        },
      ],
    ]),
    folders: new Map([
      ["root", { id: "root", name: "Root", slug: "", children: ["home"] }],
    ]),
  },
});

const createStyleDecl = (
  styleSourceId: string,
  property: StyleDecl["property"],
  value: StyleDecl["value"]
): StyleDecl => ({
  styleSourceId,
  breakpointId: "base",
  property,
  value,
});

test("duplicates an instance after itself", () => {
  const data = createData();
  const ids = ["source-copy", "child-copy"];

  const newRootInstanceId = duplicateInstanceAfterItselfMutable({
    data,
    sourceInstanceId: "source",
    parentInstanceId: "parent",
    projectId: "project-id",
    createId: () => ids.shift() ?? "missing",
  });

  expect(newRootInstanceId).toBe("source-copy");
  expect(data.instances.get("source-copy")).toEqual(
    createInstance("source-copy", [{ type: "id", value: "child-copy" }])
  );
  expect(data.instances.get("child-copy")).toEqual(
    createInstance("child-copy")
  );
  expect(data.instances.get("parent")?.children).toEqual([
    { type: "id", value: "source" },
    { type: "id", value: "source-copy" },
    { type: "id", value: "sibling" },
  ]);
});

test("removes copied grid placement when source is auto-placed", () => {
  const data = createData();
  const gridPlacement = createStyleDecl("source-local", "gridColumnStart", {
    type: "keyword",
    value: "auto",
  });
  const alignment = createStyleDecl("source-local", "alignSelf", {
    type: "keyword",
    value: "center",
  });
  data.styleSources.set("source-local", { id: "source-local", type: "local" });
  data.styleSourceSelections.set("source", {
    instanceId: "source",
    values: ["source-local"],
  });
  data.styles.set(getStyleDeclKey(gridPlacement), gridPlacement);
  data.styles.set(getStyleDeclKey(alignment), alignment);
  const ids = ["source-copy", "child-copy", "source-local-copy"];

  duplicateInstanceAfterItselfMutable({
    data,
    sourceInstanceId: "source",
    parentInstanceId: "parent",
    projectId: "project-id",
    createId: () => ids.shift() ?? "missing",
  });

  expect(data.styleSourceSelections.get("source-copy")).toEqual({
    instanceId: "source-copy",
    values: ["source-local-copy"],
  });
  expect(
    [...data.styles.values()].filter(
      (styleDecl) => styleDecl.styleSourceId === "source-local-copy"
    )
  ).toEqual([
    createStyleDecl("source-local-copy", "alignSelf", {
      type: "keyword",
      value: "center",
    }),
  ]);
});

test("creates runtime mutation for duplicating an instance after itself", () => {
  const ids = ["source-copy", "child-copy"];

  const mutation = duplicateInstanceAfterItself(
    createWebstudioData(),
    {
      sourceInstanceId: "source",
      parentInstanceId: "parent",
    },
    {
      createId: () => ids.shift() ?? "missing",
      projectId: "project-id",
    }
  );

  expect(mutation.result).toEqual({
    instanceId: "source-copy",
    parentInstanceId: "parent",
  });
  expect(mutation.payload).toEqual([
    {
      namespace: "instances",
      patches: [
        {
          op: "replace",
          path: ["parent", "children", 1],
          value: { type: "id", value: "source-copy" },
        },
        {
          op: "add",
          path: ["parent", "children", 2],
          value: { type: "id", value: "sibling" },
        },
        {
          op: "add",
          path: ["source-copy"],
          value: createInstance("source-copy", [
            { type: "id", value: "child-copy" },
          ]),
        },
        {
          op: "add",
          path: ["child-copy"],
          value: createInstance("child-copy"),
        },
      ],
    },
  ]);
});
