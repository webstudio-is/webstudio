import { expect, test } from "vitest";
import {
  getStyleDeclKey,
  ROOT_INSTANCE_ID,
  type DataSource,
  type Instance,
  type Prop,
  type Resource,
  type StyleDecl,
  type WebstudioData,
} from "@webstudio-is/sdk";
import {
  cloneInstance,
  cloneInstanceInput,
  duplicateInstanceAfterItself,
  duplicateInstanceAfterItselfMutable,
} from "./instance-duplicate";
import { applyBuilderPatchPayloadMutable } from "../state/patch";

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

const applyMutation = (
  data: WebstudioData,
  mutation: ReturnType<typeof cloneInstance>
) => {
  applyBuilderPatchPayloadMutable(
    (namespace) => data[namespace as keyof WebstudioData],
    mutation.payload
  );
};

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

test("duplicates an instance into another parent", () => {
  const data = createData();
  data.instances.set("target", createInstance("target"));
  const ids = ["source-copy", "child-copy"];

  const newRootInstanceId = duplicateInstanceAfterItselfMutable({
    data,
    sourceInstanceId: "source",
    parentInstanceId: "target",
    projectId: "project-id",
    createId: () => ids.shift() ?? "missing",
  });

  expect(newRootInstanceId).toBe("source-copy");
  expect(data.instances.get("target")?.children).toEqual([
    { type: "id", value: "source-copy" },
  ]);
});

test("does not clone the shared global root into a page", () => {
  const data = createWebstudioData();
  data.instances.set(
    ROOT_INSTANCE_ID,
    createInstance(ROOT_INSTANCE_ID, [{ type: "id", value: "parent" }])
  );

  expect(() =>
    cloneInstance(
      data,
      {
        sourceInstanceId: ROOT_INSTANCE_ID,
        targetParentInstanceId: "parent",
      },
      { createId: () => "unused", projectId: "project-id" }
    )
  ).toThrow("Source instance could not be cloned");
  expect(data.instances.get("parent")?.children).toEqual([
    { type: "id", value: "source" },
    { type: "id", value: "sibling" },
  ]);
});

test("clones into the source parent by default and appends the full subtree", () => {
  const data = createWebstudioData();
  const ids = ["source-copy", "child-copy"];

  const mutation = cloneInstance(
    data,
    { sourceInstanceId: "source" },
    {
      createId: () => ids.shift() ?? "missing",
      projectId: "project-id",
    }
  );

  expect(mutation.result).toEqual({
    instanceId: "source-copy",
    instanceIds: ["source-copy", "child-copy"],
  });
  expect(data.instances.get("parent")?.children).toEqual([
    { type: "id", value: "source" },
    { type: "id", value: "sibling" },
  ]);

  applyMutation(data, mutation);

  expect(data.instances.get("parent")?.children).toEqual([
    { type: "id", value: "source" },
    { type: "id", value: "sibling" },
    { type: "id", value: "source-copy" },
  ]);
  expect(data.instances.get("source-copy")).toEqual(
    createInstance("source-copy", [{ type: "id", value: "child-copy" }])
  );
  expect(data.instances.get("child-copy")).toEqual(
    createInstance("child-copy")
  );
});

test("clones into an explicit parent at the requested index", () => {
  const data = createWebstudioData();
  data.instances.set(
    "target",
    createInstance("target", [{ type: "id", value: "sibling" }])
  );
  const ids = ["source-copy", "child-copy"];

  const mutation = cloneInstance(
    data,
    {
      sourceInstanceId: "source",
      targetParentInstanceId: "target",
      insertIndex: 0,
    },
    {
      createId: () => ids.shift() ?? "missing",
      projectId: "project-id",
    }
  );

  applyMutation(data, mutation);

  expect(data.instances.get("parent")?.children).toEqual([
    { type: "id", value: "source" },
    { type: "id", value: "sibling" },
  ]);
  expect(data.instances.get("target")?.children).toEqual([
    { type: "id", value: "source-copy" },
    { type: "id", value: "sibling" },
  ]);
});

test("reuses one cloned resource for all cloned bindings", () => {
  const data = createWebstudioData();
  const resource: Resource = {
    id: "shared-resource",
    name: "Shared resource",
    method: "get",
    url: '"https://example.com"',
    headers: [],
  };
  const dataSource: DataSource = {
    id: "resource-data-source",
    scopeInstanceId: "child",
    name: "sharedResource",
    type: "resource",
    resourceId: resource.id,
  };
  const props: Prop[] = ["source", "child"].map((instanceId, index) => ({
    id: `resource-prop-${index}`,
    instanceId,
    name: `resource${index}`,
    type: "resource",
    value: resource.id,
  }));
  data.resources.set(resource.id, resource);
  data.dataSources.set(dataSource.id, dataSource);
  for (const prop of props) {
    data.props.set(prop.id, prop);
  }

  let idIndex = 0;
  const mutation = cloneInstance(
    data,
    { sourceInstanceId: "source" },
    {
      createId: () => `copy-${idIndex++}`,
      projectId: "project-id",
    }
  );
  applyMutation(data, mutation);

  const clonedInstanceIds = new Set(mutation.result.instanceIds);
  const clonedDataSources = [...data.dataSources.values()].filter(
    (dataSource) =>
      dataSource.type === "resource" &&
      clonedInstanceIds.has(dataSource.scopeInstanceId ?? "")
  );
  const clonedProps = [...data.props.values()].filter(
    (prop) => clonedInstanceIds.has(prop.instanceId) && prop.type === "resource"
  );
  const clonedResourceIds = [
    ...clonedDataSources.flatMap((dataSource) =>
      dataSource.type === "resource" ? [dataSource.resourceId] : []
    ),
    ...clonedProps.flatMap((prop) =>
      prop.type === "resource" ? [prop.value] : []
    ),
  ];

  expect(clonedDataSources).toHaveLength(1);
  expect(clonedProps).toHaveLength(2);
  expect(new Set(clonedResourceIds)).toHaveLength(1);
  const clonedResourceId = clonedResourceIds[0];
  if (clonedResourceId === undefined) {
    throw new Error("Expected cloned resource references");
  }
  expect(clonedResourceId).not.toBe(resource.id);
  expect(data.resources.get(clonedResourceId)).toEqual({
    ...resource,
    id: clonedResourceId,
  });
});

test("renames a cloned template when its name already exists", () => {
  const data = createWebstudioData();
  data.instances.set("parent", {
    ...data.instances.get("parent")!,
    component: "ws:block-template",
  });
  data.instances.set("source", {
    ...data.instances.get("source")!,
    component: "ws:element",
    tag: "h2",
    name: "Card",
  });
  const ids = ["source-copy", "child-copy"];

  const mutation = cloneInstance(
    data,
    { sourceInstanceId: "source" },
    {
      createId: () => ids.shift() ?? "missing",
      projectId: "project-id",
    }
  );
  applyMutation(data, mutation);

  expect(data.instances.get("source-copy")?.name).toBe("Card2");
});

test("rejects missing clone targets and insert indexes beyond the end", () => {
  const data = createWebstudioData();
  const context = { createId: () => "unused", projectId: "project-id" };
  data.instances.set("detached", createInstance("detached"));

  expect(() =>
    cloneInstance(data, { sourceInstanceId: "missing" }, context)
  ).toThrow("Instance not found");
  expect(() =>
    cloneInstance(data, { sourceInstanceId: "detached" }, context)
  ).toThrow("Instance not found");
  expect(() =>
    cloneInstance(
      data,
      { sourceInstanceId: "source", targetParentInstanceId: "missing" },
      context
    )
  ).toThrow("Instance not found");
  expect(() =>
    cloneInstance(
      data,
      {
        sourceInstanceId: "source",
        targetParentInstanceId: "parent",
        insertIndex: 3,
      },
      context
    )
  ).toThrow("Insert index is outside parent children");

  expect(data.instances.get("parent")?.children).toEqual([
    { type: "id", value: "source" },
    { type: "id", value: "sibling" },
  ]);
  expect(data.instances.has("unused")).toBe(false);
  expect(
    cloneInstanceInput.safeParse({
      sourceInstanceId: "source",
      targetParentInstanceId: "parent",
      insertIndex: -1,
    }).success
  ).toBe(false);
});

test("preserves legacy HtmlEmbed code when duplicating an instance", () => {
  const data = createData();
  data.instances.set("source", {
    ...createInstance("source"),
    component: "HtmlEmbed",
  });
  data.props.set("legacy-code", {
    id: "legacy-code",
    instanceId: "source",
    name: "code",
    type: "string",
    value: "<div><span></div>",
  });

  duplicateInstanceAfterItselfMutable({
    data,
    sourceInstanceId: "source",
    parentInstanceId: "parent",
    projectId: "project-id",
    createId: () => "source-copy",
  });

  expect(Array.from(data.props.values())).toContainEqual(
    expect.objectContaining({
      instanceId: "source-copy",
      name: "code",
      value: "<div><span></div>",
    })
  );
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
