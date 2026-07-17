import { expect, test } from "vitest";
import {
  collectionComponent,
  elementComponent,
  encodeDataVariableId,
  getStyleDeclKey,
  type Instance,
  type Page,
  type PageTemplate,
  type Pages,
  type Prop,
  type StyleDecl,
  type WsComponentMeta,
  type WebstudioData,
} from "@webstudio-is/sdk";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import {
  insertCollection,
  insertComponent,
  insertComponentInput,
  insertFragment,
  insertFragmentInput,
} from "./components";
import { getZodValidationIssues } from "./errors";
import { getComponentTemplates } from "./component-templates";
import { createEmptyWebstudioFragment } from "./component-template";
import { isLikelyWebstudioJsxFragment, parseWebstudioJsxFragment } from "./jsx";
import { inspectWebstudioJsxFragmentSyntax } from "./jsx/syntax";

const createPages = (
  rootInstanceId: Instance["id"],
  documentType?: Page["meta"]["documentType"]
): Pages => ({
  homePageId: "page",
  rootFolderId: "root",
  pages: new Map([
    [
      "page",
      {
        id: "page",
        name: "Page",
        path: "",
        title: "Page",
        rootInstanceId,
        meta: { documentType },
      },
    ],
  ]),
  folders: new Map([
    ["root", { id: "root", name: "Root", slug: "", children: ["page"] }],
  ]),
});

const createState = (
  parent: Instance,
  documentType?: Page["meta"]["documentType"]
): WebstudioData => ({
  pages: createPages(parent.id, documentType),
  instances: new Map([[parent.id, parent]]),
  props: new Map(),
  dataSources: new Map(),
  resources: new Map(),
  styleSources: new Map(),
  styleSourceSelections: new Map(),
  styles: new Map(),
  breakpoints: new Map(),
  assets: new Map(),
});

const createTemplateState = ({
  root,
  parent,
  documentType,
}: {
  root: Instance;
  parent: Instance;
  documentType?: PageTemplate["meta"]["documentType"];
}): WebstudioData => {
  const pageRoot = createParent();
  return {
    ...createState(pageRoot),
    pages: {
      ...createPages(pageRoot.id),
      pageTemplates: new Map([
        [
          "template",
          {
            id: "template",
            name: "Template",
            title: "Template",
            rootInstanceId: root.id,
            meta: { documentType },
          },
        ],
      ]),
    },
    instances: new Map([
      [pageRoot.id, pageRoot],
      [root.id, root],
      [parent.id, parent],
    ]),
  };
};

const createParent = (): Instance => ({
  type: "instance",
  id: "parent",
  component: elementComponent,
  children: [],
});

const createIdFactory = () => {
  let index = 0;
  return () => `generated-${index++}`;
};

const getAddedValues = <Value>(
  mutation: { payload: Awaited<ReturnType<typeof insertComponent>>["payload"] },
  namespace: string
) => {
  return (
    mutation.payload
      .find((change) => change.namespace === namespace)
      ?.patches.flatMap((patch) =>
        patch.op === "add" && patch.path.length === 1
          ? [patch.value as Value]
          : []
      ) ?? []
  );
};

const getReplacedValues = <Value>(
  mutation: { payload: Awaited<ReturnType<typeof insertComponent>>["payload"] },
  namespace: string
) => {
  return (
    mutation.payload
      .find((change) => change.namespace === namespace)
      ?.patches.flatMap((patch) =>
        patch.op === "replace" && patch.path.length === 1
          ? [patch.value as Value]
          : []
      ) ?? []
  );
};

test("validates component ids with canonical instance schema", () => {
  expect(
    insertComponentInput.safeParse({
      parentInstanceId: "parent",
      component: "",
    }).success
  ).toBe(false);
});

test("explains the required parent for fragments with children", () => {
  const result = insertFragmentInput.safeParse({
    fragment: {
      ...createEmptyWebstudioFragment(),
      children: [{ type: "id", value: "child" }],
    },
  });
  if (result.success) {
    throw new Error("Expected fragment input to require a parent");
  }

  expect(getZodValidationIssues(result.error)).toEqual([
    expect.objectContaining({
      code: "missing_fragment_parent",
      path: ["parentInstanceId"],
      constraint: "required_when:fragment.children.length>0",
      example: "parent-instance-id",
    }),
  ]);
});

test("requires tag when inserting ws.element component", async () => {
  const parent = createParent();

  expect(() =>
    insertComponent(
      createState(parent),
      {
        parentInstanceId: parent.id,
        component: elementComponent,
      },
      {
        createId: createIdFactory(),
      }
    )
  ).toThrow('Component "ws:element" requires "tag"');
});

test("inserts ws.element component with tag", async () => {
  const parent = createParent();
  const mutation = await insertComponent(
    createState(parent),
    {
      parentInstanceId: parent.id,
      component: elementComponent,
      tag: "section",
    },
    {
      createId: createIdFactory(),
    }
  );

  expect(mutation.result.rootInstanceIds).toEqual(["generated-0"]);
  expect(getAddedValues<Instance>(mutation, "instances")).toContainEqual(
    expect.objectContaining({
      id: "generated-0",
      component: elementComponent,
      tag: "section",
    })
  );
});

test("keeps Collection item expressions linked to each inserted parameter", () => {
  for (let insertion = 0; insertion < 2; insertion += 1) {
    const parent = createParent();
    const mutation = insertComponent(
      createState(parent),
      {
        parentInstanceId: parent.id,
        component: collectionComponent,
      },
      { createId: createIdFactory() }
    );
    const props = getAddedValues<{
      name: string;
      type: string;
      value: string;
    }>(mutation, "props");
    const itemParameterId = props.find(
      (prop) => prop.name === "item" && prop.type === "parameter"
    )?.value;
    const expressions = getAddedValues<Instance>(mutation, "instances").flatMap(
      (instance) =>
        instance.children.flatMap((child) =>
          child.type === "expression" ? [child.value] : []
        )
    );

    expect(itemParameterId).toBeDefined();
    expect(expressions).toContain(encodeDataVariableId(itemParameterId ?? ""));
  }
});

test("inserts a semantic Collection with literal data and bound item expressions", async () => {
  const parent = createParent();
  const mutation = insertCollection(
    createState(parent),
    {
      parentInstanceId: parent.id,
      data: {
        type: "json",
        value: [{ name: "Starter" }, { name: "Pro" }],
      },
      itemFragment: await parseWebstudioJsxFragment(
        '<ws.element ws:tag="article" ws:style={css`display: grid;`}><ws.element ws:tag="h2">{expression`collectionItem.name`}</ws.element></ws.element>'
      ),
    },
    { createId: createIdFactory() }
  );
  const instances = getAddedValues<Instance>(mutation, "instances");
  const props = getAddedValues<Prop>(mutation, "props");
  const styles = getAddedValues<StyleDecl>(mutation, "styles");

  expect(mutation.result).toMatchObject({
    parentInstanceId: parent.id,
    collectionInstanceId: expect.any(String),
    itemRootInstanceId: expect.any(String),
    itemParameterId: expect.any(String),
    itemKeyParameterId: expect.any(String),
  });
  expect(instances).toContainEqual(
    expect.objectContaining({
      id: mutation.result.collectionInstanceId,
      component: collectionComponent,
      children: [{ type: "id", value: mutation.result.itemRootInstanceId }],
    })
  );
  expect(
    instances.find(
      (instance) => instance.id === mutation.result.collectionInstanceId
    )
  ).not.toHaveProperty("tag");
  expect(props).toContainEqual(
    expect.objectContaining({
      instanceId: mutation.result.collectionInstanceId,
      name: "data",
      type: "json",
      value: [{ name: "Starter" }, { name: "Pro" }],
    })
  );
  expect(styles).toContainEqual(
    expect.objectContaining({
      property: "display",
      value: { type: "keyword", value: "grid" },
    })
  );
  expect(props).toContainEqual(
    expect.objectContaining({
      instanceId: mutation.result.collectionInstanceId,
      name: "item",
      type: "parameter",
      value: mutation.result.itemParameterId,
    })
  );
  expect(
    instances.flatMap((instance) =>
      instance.children.flatMap((child) =>
        child.type === "expression" ? [child.value] : []
      )
    )
  ).toContain(`${encodeDataVariableId(mutation.result.itemParameterId)}?.name`);
});

test("binds semantic Collection data to outer scope and item props to its parameter", async () => {
  const parent = createParent();
  const state = createState(parent);
  state.dataSources.set("posts", {
    id: "posts",
    type: "variable",
    name: "Posts",
    scopeInstanceId: parent.id,
    value: { type: "json", value: { data: { items: [] } } },
  });
  const mutation = insertCollection(
    state,
    {
      parentInstanceId: parent.id,
      data: { type: "expression", value: "Posts.data.items" },
      itemFragment: await parseWebstudioJsxFragment(
        '<ws.element ws:tag="article" title={expression`collectionItem.title`}>Item</ws.element>'
      ),
    },
    { createId: createIdFactory() }
  );
  const props = getAddedValues<Prop>(mutation, "props");

  expect(props).toContainEqual(
    expect.objectContaining({
      instanceId: mutation.result.collectionInstanceId,
      name: "data",
      type: "expression",
      value: `${encodeDataVariableId("posts")}?.data?.items`,
    })
  );
  expect(props).toContainEqual(
    expect.objectContaining({
      instanceId: mutation.result.itemRootInstanceId,
      name: "title",
      type: "expression",
      value: `${encodeDataVariableId(mutation.result.itemParameterId)}?.title`,
    })
  );
});

test("binds semantic Collection data to an HTTP resource result", async () => {
  const parent = createParent();
  const state = createState(parent);
  state.dataSources.set("posts", {
    id: "posts",
    type: "resource",
    name: "Posts",
    scopeInstanceId: parent.id,
    resourceId: "posts-resource",
  });
  const mutation = insertCollection(
    state,
    {
      parentInstanceId: parent.id,
      data: { type: "expression", value: "Posts.data.items" },
      itemFragment: await parseWebstudioJsxFragment(
        '<ws.element ws:tag="article">{expression`collectionItem.title`}</ws.element>'
      ),
    },
    { createId: createIdFactory() }
  );
  const dataProp = getAddedValues<Prop>(mutation, "props").find(
    (prop) =>
      prop.instanceId === mutation.result.collectionInstanceId &&
      prop.name === "data"
  );

  expect(dataProp).toMatchObject({
    type: "expression",
    value: `${encodeDataVariableId("posts")}?.data?.items`,
  });
});

test("binds object Collection keys to the generated itemKey parameter", async () => {
  const parent = createParent();
  const mutation = insertCollection(
    createState(parent),
    {
      parentInstanceId: parent.id,
      data: {
        type: "json",
        value: { starter: { name: "Starter" }, pro: { name: "Pro" } },
      },
      itemFragment: await parseWebstudioJsxFragment(
        '<ws.element ws:tag="article">{expression`collectionItemKey`}</ws.element>'
      ),
    },
    { createId: createIdFactory() }
  );
  const itemRoot = getAddedValues<Instance>(mutation, "instances").find(
    (instance) => instance.id === mutation.result.itemRootInstanceId
  );

  expect(itemRoot?.children).toContainEqual({
    type: "expression",
    value: encodeDataVariableId(mutation.result.itemKeyParameterId),
  });
});

test("requires one semantic Collection item root", async () => {
  const parent = createParent();
  const itemFragment = await parseWebstudioJsxFragment(
    '<ws.element ws:tag="div" /><ws.element ws:tag="div" />'
  );
  expect(() =>
    insertCollection(
      createState(parent),
      {
        parentInstanceId: parent.id,
        data: { type: "json", value: [] },
        itemFragment,
      },
      { createId: createIdFactory() }
    )
  ).toThrow("exactly one root instance");
});

test.each([
  {
    name: "duplicate ids",
    createExtra: (root: Instance) => ({ ...root }),
    message: "instance ids must be unique",
  },
  {
    name: "a disconnected instance",
    createExtra: (root: Instance) => ({ ...root, id: "disconnected" }),
    message: "must not contain instances disconnected from its root",
  },
])(
  "rejects Collection item fragments with $name",
  ({ createExtra, message }) => {
    const parent = createParent();
    const root: Instance = {
      type: "instance",
      id: "item-root",
      component: elementComponent,
      tag: "article",
      children: [],
    };
    expect(() =>
      insertCollection(
        createState(parent),
        {
          parentInstanceId: parent.id,
          data: { type: "json", value: [] },
          itemFragment: {
            ...createEmptyWebstudioFragment(),
            children: [{ type: "id", value: root.id }],
            instances: [root, createExtra(root)],
          },
        },
        { createId: createIdFactory() }
      )
    ).toThrow(message);
  }
);

test.each([
  {
    name: "a missing child",
    childId: "missing",
    message: 'references missing instance "missing"',
  },
  {
    name: "a cycle",
    childId: "item-root",
    message: "instance tree must not contain a cycle",
  },
])("rejects Collection item fragments with $name", ({ childId, message }) => {
  const parent = createParent();
  expect(() =>
    insertCollection(
      createState(parent),
      {
        parentInstanceId: parent.id,
        data: { type: "json", value: [] },
        itemFragment: {
          ...createEmptyWebstudioFragment(),
          children: [{ type: "id", value: "item-root" }],
          instances: [
            {
              type: "instance",
              id: "item-root",
              component: elementComponent,
              tag: "article",
              children: [{ type: "id", value: childId }],
            },
          ],
        },
      },
      { createId: createIdFactory() }
    )
  ).toThrow(message);
});

test("rejects Collection item ids that collide with its canonical template", () => {
  const parent = createParent();
  const template = getComponentTemplates().get(collectionComponent)?.template;
  const collectionRoot = template?.children[0];
  expect(collectionRoot?.type).toBe("id");
  if (collectionRoot?.type !== "id") {
    throw new Error("Collection template root is unavailable");
  }

  expect(() =>
    insertCollection(
      createState(parent),
      {
        parentInstanceId: parent.id,
        data: { type: "json", value: [] },
        itemFragment: {
          ...createEmptyWebstudioFragment(),
          children: [{ type: "id", value: collectionRoot.value }],
          instances: [
            {
              type: "instance",
              id: collectionRoot.value,
              component: elementComponent,
              tag: "article",
              children: [],
            },
          ],
        },
      },
      { createId: createIdFactory() }
    )
  ).toThrow("conflicts with the generated Collection template");
});

test("inserts fragment into page template", async () => {
  const parent = createParent();
  const root: Instance = {
    type: "instance",
    id: "template-root",
    component: elementComponent,
    children: [{ type: "id", value: parent.id }],
  };
  const fragment = await parseWebstudioJsxFragment("<$.Box />");

  const mutation = insertFragment(
    createTemplateState({ root, parent }),
    {
      parentInstanceId: parent.id,
      fragment,
    },
    {
      createId: createIdFactory(),
    }
  );

  expect(mutation.result.rootInstanceIds).toEqual(["generated-0"]);
  expect(getAddedValues<Instance>(mutation, "instances")).toContainEqual(
    expect.objectContaining({
      id: "generated-0",
      component: "Box",
    })
  );
});

test("rejects tag when inserting non-element component", async () => {
  const parent = createParent();

  expect(() =>
    insertComponent(
      createState(parent),
      {
        parentInstanceId: parent.id,
        component: "custom:Widget",
        tag: "section",
      },
      {
        createId: createIdFactory(),
      }
    )
  ).toThrow('"tag" can only be used with component "ws:element"');
});

test("rejects unknown Webstudio core components", () => {
  const parent = createParent();

  expect(() =>
    insertComponent(
      createState(parent),
      {
        parentInstanceId: parent.id,
        component: "ws:div",
      },
      {
        createId: createIdFactory(),
      }
    )
  ).toThrow(
    'Component "ws:div" does not exist. The "ws:" namespace contains Webstudio core components, not HTML tag shorthands.'
  );
});

test("rejects unknown Webstudio core components in JSX fragments", async () => {
  const parent = createParent();
  const fragment = await parseWebstudioJsxFragment(`<ws.div />`);

  expect(() =>
    insertFragment(
      createState(parent),
      {
        parentInstanceId: parent.id,
        fragment,
      },
      {
        createId: createIdFactory(),
      }
    )
  ).toThrow(
    'Component "ws:div" does not exist. The "ws:" namespace contains Webstudio core components, not HTML tag shorthands.'
  );
});

test("inserts registered component template", async () => {
  const parent = createParent();
  const mutation = await insertComponent(
    createState(parent),
    {
      parentInstanceId: parent.id,
      component: "@webstudio-is/sdk-components-react-radix:Switch",
    },
    {
      createId: createIdFactory(),
      projectId: "project-id",
    }
  );

  expect(mutation.result.rootInstanceIds).toEqual(["generated-0"]);
  expect(mutation.result.instanceIds).toEqual(["generated-0", "generated-1"]);
  const instancePatches =
    mutation.payload.find((change) => change.namespace === "instances")
      ?.patches ?? [];
  expect(instancePatches).toContainEqual({
    op: "add",
    path: ["parent", "children"],
    value: [{ type: "id", value: "generated-0" }],
  });
  expect(instancePatches).toContainEqual({
    op: "add",
    path: ["generated-0"],
    value: expect.objectContaining({
      id: "generated-0",
      component: "@webstudio-is/sdk-components-react-radix:Switch",
      children: [{ type: "id", value: "generated-1" }],
    }),
  });
  expect(instancePatches).toContainEqual({
    op: "add",
    path: ["generated-1"],
    value: expect.objectContaining({
      id: "generated-1",
      component: "@webstudio-is/sdk-components-react-radix:SwitchThumb",
    }),
  });
});

test("remaps action data source references when inserting registered component template", async () => {
  const parent = createParent();
  const mutation = await insertComponent(
    createState(parent),
    {
      parentInstanceId: parent.id,
      component: "Form",
    },
    {
      createId: createIdFactory(),
      projectId: "project-id",
    }
  );

  const [formDataSource] = getAddedValues<{ id: string; name: string }>(
    mutation,
    "dataSources"
  );
  expect(formDataSource).toMatchObject({
    id: "generated-9",
    name: "formState",
  });
  const formProps = getAddedValues<{
    id: string;
    instanceId: string;
    name: string;
    type: string;
    value: unknown;
  }>(mutation, "props").filter(
    (prop) => prop.name === "state" || prop.name === "onStateChange"
  );
  expect(formProps).toEqual([
    {
      id: "generated-10",
      instanceId: "generated-0",
      name: "state",
      type: "expression",
      value: "$ws$dataSource$generated__DASH__9",
    },
    {
      id: "generated-11",
      instanceId: "generated-0",
      name: "onStateChange",
      type: "action",
      value: [
        {
          type: "execute",
          args: ["state"],
          code: "$ws$dataSource$generated__DASH__9 = state",
        },
      ],
    },
  ]);
});

test("inserts webstudio jsx fragment with styles", async () => {
  const parent = createParent();
  const mutation = await insertFragment(
    createState(parent),
    {
      parentInstanceId: parent.id,
      fragment:
        await parseWebstudioJsxFragment(`<ws.element ws:tag="section" ws:style={css\`
        padding: 32px;
        @media (min-width: 768px) {
          padding: 48px;
        }
      \`}>
        <ws.element ws:tag="h2">Northstar Design System</ws.element>
        <radix.Switch><radix.SwitchThumb /></radix.Switch>
      </ws.element>`),
    },
    {
      createId: createIdFactory(),
      projectId: "project-id",
    }
  );

  expect(mutation.result.rootInstanceIds).toEqual(["generated-0"]);
  const addedInstances = getAddedValues<Instance>(mutation, "instances");
  expect(addedInstances.map((instance) => instance.component)).toEqual([
    "ws:element",
    "ws:element",
    "@webstudio-is/sdk-components-react-radix:Switch",
    "@webstudio-is/sdk-components-react-radix:SwitchThumb",
  ]);
  expect(addedInstances[1]?.children).toEqual([
    { type: "text", value: "Northstar Design System" },
  ]);
  expect(
    getAddedValues<{ label: string }>(mutation, "breakpoints").map(
      (breakpoint) => breakpoint.label
    )
  ).toEqual(["", "768"]);
  expect(
    getAddedValues<{ property: string }>(mutation, "styles").map(
      (style) => style.property
    )
  ).toEqual([
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
  ]);
});

test("remaps fragment breakpoint ids that conflict with existing breakpoints", () => {
  const parent = createParent();
  const state = createState(parent);
  state.breakpoints.set("1", {
    id: "1",
    label: "Desktop",
    minWidth: 1280,
  });

  const mutation = insertFragment(
    state,
    {
      parentInstanceId: parent.id,
      fragment: {
        ...createEmptyWebstudioFragment(),
        children: [{ type: "id", value: "fragment-instance" }],
        instances: [
          {
            type: "instance",
            id: "fragment-instance",
            component: elementComponent,
            tag: "div",
            children: [],
          },
        ],
        styleSourceSelections: [
          { instanceId: "fragment-instance", values: ["local-style"] },
        ],
        styleSources: [{ type: "local", id: "local-style" }],
        breakpoints: [{ id: "1", label: "Tablet", maxWidth: 991 }],
        styles: [
          {
            styleSourceId: "local-style",
            breakpointId: "1",
            property: "display",
            value: { type: "keyword", value: "grid" },
          },
        ],
      },
    },
    {
      createId: createIdFactory(),
      projectId: "project-id",
    }
  );

  expect(getAddedValues<{ id: string }>(mutation, "breakpoints")).toEqual([
    expect.objectContaining({ id: "generated-0", maxWidth: 991 }),
  ]);
  expect(getAddedValues<StyleDecl>(mutation, "styles")).toContainEqual(
    expect.objectContaining({ breakpointId: "generated-0" })
  );
});

test("inserts fragment into legacy Slot content by normalizing shared Fragment", async () => {
  const state = createState({
    type: "instance",
    id: "body",
    component: "Body",
    children: [
      { type: "id", value: "slot1" },
      { type: "id", value: "slot2" },
    ],
  });
  state.instances = new Map([
    [
      "body",
      {
        type: "instance",
        id: "body",
        component: "Body",
        children: [
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
        ],
      },
    ],
    [
      "slot1",
      {
        type: "instance",
        id: "slot1",
        component: "Slot",
        children: [{ type: "id", value: "box" }],
      },
    ],
    [
      "slot2",
      {
        type: "instance",
        id: "slot2",
        component: "Slot",
        children: [{ type: "id", value: "box" }],
      },
    ],
    [
      "box",
      {
        type: "instance",
        id: "box",
        component: "Box",
        children: [],
      },
    ],
  ]);

  const mutation = await insertFragment(
    state,
    {
      parentInstanceId: "slot1",
      fragment: {
        ...createEmptyWebstudioFragment(),
        children: [{ type: "id", value: "heading" }],
        instances: [
          {
            type: "instance",
            id: "heading",
            component: elementComponent,
            tag: "h2",
            children: [],
          },
        ],
      },
    },
    {
      createId: createIdFactory(),
      projectId: "project-id",
    }
  );

  expect(mutation.result).toEqual({
    instanceIds: ["generated-1"],
    rootInstanceIds: ["generated-1"],
    removedInstanceIds: [],
    parentInstanceId: "generated-0",
  });
  expect(getAddedValues<Instance>(mutation, "instances")).toEqual([
    {
      type: "instance",
      id: "generated-0",
      component: "Fragment",
      children: [
        { type: "id", value: "box" },
        { type: "id", value: "generated-1" },
      ],
    },
    {
      type: "instance",
      id: "generated-1",
      component: elementComponent,
      tag: "h2",
      children: [],
    },
  ]);
  expect(getReplacedValues<Instance>(mutation, "instances")).toEqual([
    {
      type: "instance",
      id: "slot1",
      component: "Slot",
      children: [{ type: "id", value: "generated-0" }],
    },
    {
      type: "instance",
      id: "slot2",
      component: "Slot",
      children: [{ type: "id", value: "generated-0" }],
    },
  ]);
});

test("honors fragment token conflict resolution", async () => {
  const parent = createParent();
  const state = createState(parent);
  const existingFragment = await parseWebstudioJsxFragment(
    `<ws.element ws:tag="div" ws:tokens={[token("brand", css\`color: blue;\`)]} />`
  );
  for (const styleSource of existingFragment.styleSources) {
    state.styleSources.set(styleSource.id, styleSource);
  }
  for (const style of existingFragment.styles) {
    state.styles.set(getStyleDeclKey(style), style);
  }
  for (const breakpoint of existingFragment.breakpoints) {
    state.breakpoints.set(breakpoint.id, breakpoint);
  }

  const mutation = await insertFragment(
    state,
    {
      parentInstanceId: parent.id,
      fragment: await parseWebstudioJsxFragment(
        `<ws.element ws:tag="div" ws:tokens={[token("brand", css\`color: red;\`)]} />`
      ),
      conflictResolution: "ours",
    },
    {
      createId: createIdFactory(),
      projectId: "project-id",
    }
  );

  const addedTokenSources = getAddedValues<{ type: string; name: string }>(
    mutation,
    "styleSources"
  ).filter((styleSource) => styleSource.type === "token");
  expect(addedTokenSources).toEqual([]);
  expect(
    getAddedValues<{ property: string; value: unknown }>(mutation, "styles")
  ).not.toContainEqual(
    expect.objectContaining({
      property: "color",
      value: { type: "keyword", value: "red" },
    })
  );
});

test("inserts token-only fragments without a parent instance", async () => {
  const parent = createParent();
  const state = createState(parent);
  const mutation = await insertFragment(
    state,
    {
      fragment: {
        ...createEmptyWebstudioFragment(),
        styleSources: [{ type: "token", id: "brand", name: "Brand" }],
        styles: [
          {
            styleSourceId: "brand",
            breakpointId: "base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
        ],
        breakpoints: [{ id: "base", label: "" }],
      },
    },
    {
      createId: createIdFactory(),
      projectId: "project-id",
    }
  );

  expect(mutation.result.rootInstanceIds).toEqual([]);
  expect(
    getAddedValues<{ type: string; name: string }>(mutation, "styleSources")
  ).toEqual([{ type: "token", id: "generated-0", name: "Brand" }]);
  expect(
    getAddedValues<{ property: string; value: unknown }>(mutation, "styles")
  ).toContainEqual(
    expect.objectContaining({
      property: "color",
      value: { type: "keyword", value: "red" },
    })
  );
});

test("merges fragment token conflicts by replacing existing token styles", async () => {
  const parent = createParent();
  const state = createState(parent);
  const existingFragment = await parseWebstudioJsxFragment(
    `<ws.element ws:tag="div" ws:tokens={[token("brand", css\`color: blue; font-size: 16px;\`)]} />`
  );
  for (const styleSource of existingFragment.styleSources) {
    state.styleSources.set(styleSource.id, styleSource);
  }
  for (const style of existingFragment.styles) {
    state.styles.set(getStyleDeclKey(style), style);
  }
  for (const breakpoint of existingFragment.breakpoints) {
    state.breakpoints.set(breakpoint.id, breakpoint);
  }

  const mutation = await insertFragment(
    state,
    {
      parentInstanceId: parent.id,
      fragment: await parseWebstudioJsxFragment(
        `<ws.element ws:tag="div" ws:tokens={[token("brand", css\`color: red; font-weight: bold;\`)]} />`
      ),
      conflictResolution: "merge",
    },
    {
      createId: createIdFactory(),
      projectId: "project-id",
    }
  );

  expect(
    getAddedValues<{ type: string; name: string }>(mutation, "styleSources")
  ).toEqual([]);
  expect(
    getReplacedValues<{ property: string; value: unknown }>(mutation, "styles")
  ).toContainEqual(
    expect.objectContaining({
      property: "color",
      value: { type: "keyword", value: "red" },
    })
  );
  expect(
    getAddedValues<{ property: string; value: unknown }>(mutation, "styles")
  ).toContainEqual(
    expect.objectContaining({
      property: "fontWeight",
      value: { type: "keyword", value: "bold" },
    })
  );
});

test("inserts animation action props parsed from webstudio jsx fragments", async () => {
  const parent = createParent();
  const state = createState(parent);
  const fragment = await parseWebstudioJsxFragment(
    `<animation.AnimateChildren action={{type:"view",animations:[{timing:{fill:"backwards",rangeStart:["entry",{type:"unit",value:0,unit:"%"}],rangeEnd:["entry",{type:"unit",value:100,unit:"%"}]},keyframes:[{styles:{opacity:{type:"unit",value:0,unit:"number"}}}]}]}}><ws.element ws:tag="h2">Reveal</ws.element></animation.AnimateChildren>`
  );

  expect(fragment.props).toContainEqual(
    expect.objectContaining({
      name: "action",
      type: "animationAction",
      value: expect.objectContaining({ type: "view" }),
    })
  );

  const mutation = await insertFragment(
    state,
    {
      parentInstanceId: parent.id,
      fragment,
      conflictResolution: "merge",
    },
    {
      createId: createIdFactory(),
      projectId: "project-id",
    }
  );

  expect(
    getAddedValues<{ type: string; name: string }>(mutation, "props")
  ).toContainEqual(
    expect.objectContaining({
      name: "action",
      type: "animationAction",
      value: expect.objectContaining({ type: "view" }),
    })
  );
});

test("detects likely Webstudio JSX fragments", () => {
  expect(isLikelyWebstudioJsxFragment("<$.Box />")).toBe(true);
  expect(isLikelyWebstudioJsxFragment("\n  < $ .Box />")).toBe(true);
  expect(isLikelyWebstudioJsxFragment("< $ . Box />")).toBe(true);
  expect(isLikelyWebstudioJsxFragment('<ws.element ws:tag="section" />')).toBe(
    true
  );
  expect(isLikelyWebstudioJsxFragment("<radix.Switch />")).toBe(true);
  expect(isLikelyWebstudioJsxFragment("<animation.VideoAnimation />")).toBe(
    true
  );
  expect(isLikelyWebstudioJsxFragment("<$. />")).toBe(false);
  expect(isLikelyWebstudioJsxFragment("<$.>")).toBe(false);
  expect(isLikelyWebstudioJsxFragment("</$.Box>")).toBe(false);
  expect(isLikelyWebstudioJsxFragment("<section>HTML</section>")).toBe(false);
  expect(isLikelyWebstudioJsxFragment("## Markdown")).toBe(false);
});

test("inspects webstudio jsx fragment syntax without evaluation", () => {
  expect(() =>
    inspectWebstudioJsxFragmentSyntax(
      `<$.Box data-safe={{ process: "text" }} />`
    )
  ).not.toThrow();
  expect(() =>
    inspectWebstudioJsxFragmentSyntax(`import { Box } from "x"; <$.Box />`)
  ).toThrow("Do not use import or export in JSX fragments");
  expect(() =>
    inspectWebstudioJsxFragmentSyntax(`<$.Box data-secret={process.env} />`)
  ).toThrow('Do not access "process" in JSX fragments');
  expect(() =>
    inspectWebstudioJsxFragmentSyntax(
      `<$.Box data-secret={import("node:fs")} />`
    )
  ).toThrow("Do not use dynamic import() in JSX fragments");
  expect(() =>
    inspectWebstudioJsxFragmentSyntax(`<div>Hello</div>`)
  ).not.toThrow();
});

test("inserts bare template-backed components from webstudio jsx fragments", async () => {
  const parent = createParent();
  const fragment = await parseWebstudioJsxFragment(`<radix.Switch />`);

  const mutation = insertFragment(
    createState(parent),
    {
      parentInstanceId: parent.id,
      fragment,
    },
    {
      createId: createIdFactory(),
      projectId: "project-id",
    }
  );

  expect(getAddedValues<Instance>(mutation, "instances")).toEqual([
    expect.objectContaining({
      component: "@webstudio-is/sdk-components-react-radix:Switch",
    }),
  ]);
});

test("inserts authored template part structure from webstudio jsx fragments", async () => {
  const parent = createParent();
  const fragment = await parseWebstudioJsxFragment(
    `<radix.Switch><ws.element ws:tag="div"><radix.SwitchThumb /></ws.element></radix.Switch>`
  );

  const mutation = insertFragment(
    createState(parent),
    {
      parentInstanceId: parent.id,
      fragment,
    },
    {
      createId: createIdFactory(),
      projectId: "project-id",
    }
  );

  expect(getAddedValues<Instance>(mutation, "instances")).toEqual([
    expect.objectContaining({
      component: "@webstudio-is/sdk-components-react-radix:Switch",
    }),
    expect.objectContaining({
      component: elementComponent,
      tag: "div",
    }),
    expect.objectContaining({
      component: "@webstudio-is/sdk-components-react-radix:SwitchThumb",
    }),
  ]);
});

test("supports react style props in webstudio jsx fragments", async () => {
  const fragment = await parseWebstudioJsxFragment(
    `<$.Box style={{ padding: 24 }}>Hello</$.Box>`
  );
  expect(fragment.props.find((prop) => prop.name === "style")).toBeUndefined();
  expect(fragment.styleSources).toEqual([
    { id: expect.stringMatching(/:ws:style$/), type: "local" },
  ]);
  expect(fragment.styleSourceSelections).toEqual([
    {
      instanceId: fragment.instances[0]?.id,
      values: [fragment.styleSources[0]?.id],
    },
  ]);
  expect(fragment.styles).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        styleSourceId: fragment.styleSources[0]?.id,
        property: "paddingTop",
        value: { type: "unit", unit: "px", value: 24 },
      }),
    ])
  );
  await expect(
    parseWebstudioJsxFragment(`<$.Box ws:style="padding: 24px;">Hello</$.Box>`)
  ).rejects.toThrow(/^ws:style must come from css`...`/);
  await expect(
    parseWebstudioJsxFragment(`<$.Box ws:style={css\`\`}>Hello</$.Box>`)
  ).rejects.toThrow(
    /^ws:style must include at least one valid CSS declaration/
  );
});

test("rejects invalid token syntax in webstudio jsx fragments", async () => {
  await expect(
    parseWebstudioJsxFragment(`<$.Box ws:tokens="brand">Hello</$.Box>`)
  ).rejects.toThrow(/^ws:tokens must be an array of token\(\.\.\.\) values/);
  await expect(
    parseWebstudioJsxFragment(
      `<$.Box ws:tokens={[token("brand", "color: red;")]}>Hello</$.Box>`
    )
  ).rejects.toThrow(/^token\(\) styles must come from css`...`/);
  await expect(
    parseWebstudioJsxFragment(
      `<$.Box ws:tokens={[token("brand", css\`\`)]}>Hello</$.Box>`
    )
  ).rejects.toThrow(
    /^token\(\) styles must include at least one valid CSS declaration/
  );
});

test("converts react prop aliases in webstudio jsx fragments", async () => {
  expect(
    (await parseWebstudioJsxFragment(`<$.Box className="panel">Hello</$.Box>`))
      .props
  ).toEqual([
    expect.objectContaining({
      name: "class",
      type: "string",
      value: "panel",
    }),
  ]);
  expect(
    (
      await parseWebstudioJsxFragment(
        `<$.Label htmlFor="email">Email</$.Label>`
      )
    ).props
  ).toEqual([
    expect.objectContaining({
      name: "for",
      type: "string",
      value: "email",
    }),
  ]);
});

test("rejects javascript function props in webstudio jsx fragments", async () => {
  await expect(
    parseWebstudioJsxFragment(
      `<$.Button onClick={() => alert(1)}>Click</$.Button>`
    )
  ).rejects.toThrow(
    'Invalid JSX prop "onClick". Do not pass JavaScript functions. Use Webstudio actions instead'
  );
  await expect(
    parseWebstudioJsxFragment(
      `<$.Box data-config={{ onSave: () => alert(1) }}>Save</$.Box>`
    )
  ).rejects.toThrow(
    'Invalid JSX prop "data-config" at "onSave". Do not pass JavaScript functions. Use Webstudio actions instead'
  );

  expect(
    (
      await parseWebstudioJsxFragment(
        `<$.Button onClick={new ActionValue(["event"], expression\`console.log(event)\`)}>Click</$.Button>`
      )
    ).props
  ).toEqual([
    expect.objectContaining({
      name: "onClick",
      type: "action",
      value: [
        {
          type: "execute",
          args: ["event"],
          code: "console.log(event)",
        },
      ],
    }),
  ]);
});

test("rejects non-serializable prop values in webstudio jsx fragments", async () => {
  await expect(
    parseWebstudioJsxFragment(`<$.Box data-value={undefined}>Value</$.Box>`)
  ).rejects.toThrow(
    'Invalid JSX prop "data-value". Do not pass undefined. Omit the prop or use null instead.'
  );
  await expect(
    parseWebstudioJsxFragment(`<$.Box data-value={NaN}>Value</$.Box>`)
  ).rejects.toThrow(
    'Invalid JSX prop "data-value". Do not pass NaN or Infinity. Use a finite number instead.'
  );
  await expect(
    parseWebstudioJsxFragment(`<$.Box data-value={BigInt(1)}>Value</$.Box>`)
  ).rejects.toThrow(
    'Invalid JSX prop "data-value". Do not pass BigInt values. Use a string, finite number, or expression instead.'
  );
  await expect(
    parseWebstudioJsxFragment(
      `<$.Box data-config={{ values: [1, Symbol("bad")] }}>Value</$.Box>`
    )
  ).rejects.toThrow(
    'Invalid JSX prop "data-config" at "values.1". Do not pass Symbol values. Use a string, finite number, or expression instead.'
  );
  await expect(
    parseWebstudioJsxFragment(`<$.Box data-value={new Date(0)}>Value</$.Box>`)
  ).rejects.toThrow(
    'Invalid JSX prop "data-value". Do not pass Date objects. Use plain JSON-compatible values instead.'
  );
  await expect(
    parseWebstudioJsxFragment(
      `<$.Box data-value={new Map([["a", 1]])}>Value</$.Box>`
    )
  ).rejects.toThrow(
    'Invalid JSX prop "data-value". Do not pass Map objects. Use plain JSON-compatible values instead.'
  );
  await expect(
    parseWebstudioJsxFragment(
      `{(() => { class Config {}; return <$.Box data-value={new Config()}>Value</$.Box>; })()}`
    )
  ).rejects.toThrow(
    'Invalid JSX prop "data-value". Do not pass Config objects. Use plain JSON-compatible values instead.'
  );
  await expect(
    parseWebstudioJsxFragment(
      `{(() => { const data = {}; data.self = data; return <$.Box data-value={data}>Value</$.Box>; })()}`
    )
  ).rejects.toThrow(
    'Invalid JSX prop "data-value" at "self". Do not pass circular objects. Use plain JSON-compatible values instead.'
  );
});

test("rejects host runtime globals in webstudio jsx fragments", async () => {
  await expect(
    parseWebstudioJsxFragment(`<$.Box data-secret={process.env}>Secret</$.Box>`)
  ).rejects.toThrow('Do not access "process" in JSX fragments');
  await expect(
    parseWebstudioJsxFragment(
      `<$.Box data-version={globalThis.process?.versions?.node}>Version</$.Box>`
    )
  ).rejects.toThrow('Do not access "globalThis" in JSX fragments');
  await expect(
    parseWebstudioJsxFragment(
      `<$.Box data-secret={this.constructor.constructor("return process.env")()}>Secret</$.Box>`
    )
  ).rejects.toThrow('Do not access "constructor" in JSX fragments');
  await expect(
    parseWebstudioJsxFragment(
      `<$.Box data-secret={this["constructor"]["constructor"]("return process.env")()}>Secret</$.Box>`
    )
  ).rejects.toThrow('Do not access "constructor" in JSX fragments');
  await expect(
    parseWebstudioJsxFragment(
      `<$.Box data-secret={({})["con" + "structor"]["con" + "structor"]("return process.env")()}>Secret</$.Box>`
    )
  ).rejects.toThrow("Code generation from strings disallowed");
  await expect(
    parseWebstudioJsxFragment(`<$.Box data-secret={eval("1")}>Secret</$.Box>`)
  ).rejects.toThrow('Do not access "eval" in JSX fragments');
  await expect(
    parseWebstudioJsxFragment(
      `<$.Box data-secret={Function("return process.env")()}>Secret</$.Box>`
    )
  ).rejects.toThrow('Do not access "Function" in JSX fragments');
  await expect(
    parseWebstudioJsxFragment(
      `<$.Box data-secret={require("fs")}>Secret</$.Box>`
    )
  ).rejects.toThrow('Do not access "require" in JSX fragments');
  await expect(
    parseWebstudioJsxFragment(`<$.Box data-secret={module}>Secret</$.Box>`)
  ).rejects.toThrow('Do not access "module" in JSX fragments');
  await expect(
    parseWebstudioJsxFragment(`<$.Box data-secret={exports}>Secret</$.Box>`)
  ).rejects.toThrow('Do not access "exports" in JSX fragments');
  await expect(
    parseWebstudioJsxFragment(
      `<$.Box data-secret={import("node:fs")}>Secret</$.Box>`
    )
  ).rejects.toThrow("Do not use dynamic import() in JSX fragments");
});

test("allows restricted words in non-executed jsx values", async () => {
  expect(
    (
      await parseWebstudioJsxFragment(
        `<$.Paragraph>The constructor pattern is a JavaScript escape hatch.</$.Paragraph>`
      )
    ).instances[0]?.children
  ).toEqual([
    {
      type: "text",
      value: "The constructor pattern is a JavaScript escape hatch.",
    },
  ]);
  expect(
    (
      await parseWebstudioJsxFragment(
        `<$.Box data-config={{ constructor: "documentation", process: "docs", eval: "docs", Function: "docs", globalThis: "docs" }}>Value</$.Box>`
      )
    ).props
  ).toEqual([
    expect.objectContaining({
      name: "data-config",
      type: "json",
      value: {
        constructor: "documentation",
        process: "docs",
        eval: "docs",
        Function: "docs",
        globalThis: "docs",
      },
    }),
  ]);
  expect(
    (
      await parseWebstudioJsxFragment(
        `<$.Box data-config={{ exports: "docs", module: "docs", require: "docs" }}>Value</$.Box>`
      )
    ).props
  ).toEqual([
    expect.objectContaining({
      name: "data-config",
      type: "json",
      value: {
        exports: "docs",
        module: "docs",
        require: "docs",
      },
    }),
  ]);
  expect(
    (
      await parseWebstudioJsxFragment(
        `<$.Button onClick={new ActionValue([], expression\`console.log(process)\`)}>Click</$.Button>`
      )
    ).props
  ).toEqual([
    expect.objectContaining({
      name: "onClick",
      type: "action",
      value: [
        {
          type: "execute",
          args: [],
          code: "console.log(process)",
        },
      ],
    }),
  ]);
});

test("rejects host runtime globals inside jsx expression holes", async () => {
  await expect(
    parseWebstudioJsxFragment(
      `<$.Box data-secret={expression\`${"${process.env}"}\`}>Secret</$.Box>`
    )
  ).rejects.toThrow('Do not access "process" in JSX fragments');
});

test("rejects manual system ids in webstudio jsx fragments", async () => {
  await expect(
    parseWebstudioJsxFragment(`<$.Box ws:id="manual-id" />`)
  ).rejects.toThrow("Do not set ws:id in JSX fragments");
  await expect(
    parseWebstudioJsxFragment(`<$.Box ws:id="0" />`)
  ).rejects.toThrow("Do not set ws:id in JSX fragments");
  await expect(
    parseWebstudioJsxFragment(`<$.Box {...{"ws:id": "0"}} />`)
  ).rejects.toThrow("Do not set ws:id in JSX fragments");
});

test("rejects module syntax in webstudio jsx fragments", async () => {
  await expect(
    parseWebstudioJsxFragment(`import { Box } from "x"; <$.Box />`)
  ).rejects.toThrow("Do not use import or export in JSX fragments");
  await expect(
    parseWebstudioJsxFragment(`export const view = <$.Box />`)
  ).rejects.toThrow("Do not use import or export in JSX fragments");
  await expect(
    parseWebstudioJsxFragment(`import { Box } from "x"; <$.Box />`)
  ).rejects.toMatchObject({
    code: "INVALID_INPUT",
    issues: [
      expect.objectContaining({
        code: "invalid_webstudio_jsx",
        path: ["fragment"],
        constraint: "declarative_jsx_without_modules",
        example:
          '<ws.element ws:tag="section"><ws.element ws:tag="h2">Title</ws.element></ws.element>',
      }),
    ],
  });
});

test("rejects react fragment shorthand in webstudio jsx fragments", async () => {
  await expect(parseWebstudioJsxFragment(`<><$.Box /></>`)).rejects.toThrow(
    "Do not use React fragment shorthand <>...</> inside Webstudio JSX"
  );
  await expect(parseWebstudioJsxFragment(`<>Text</>`)).rejects.toThrow(
    "Pass sibling Webstudio components directly"
  );
});

test("rejects raw html tags in webstudio jsx fragments", async () => {
  await expect(parseWebstudioJsxFragment(`<div>Hello</div>`)).rejects.toThrow(
    "Use Webstudio components such as <$.Box>...</$.Box>"
  );
  await expect(
    parseWebstudioJsxFragment(`<button>Open</button>`)
  ).rejects.toThrow("Use Webstudio components such as <$.Box>...</$.Box>");
});

test("validates ws.element tag in fragment insertion", async () => {
  const parent = createParent();
  const fragment = await parseWebstudioJsxFragment(
    `<ws.element><$.Paragraph>Missing tag</$.Paragraph></ws.element>`
  );
  expect(() =>
    insertFragment(
      createState(parent),
      {
        parentInstanceId: parent.id,
        fragment,
      },
      {
        createId: createIdFactory(),
        projectId: "project-id",
      }
    )
  ).toThrow('Component "ws:element" requires a non-empty tag');
  await expect(
    parseWebstudioJsxFragment(
      `<ws.element ws:tag={""}><$.Paragraph>Empty tag</$.Paragraph></ws.element>`
    )
  ).rejects.toThrow("Tag cannot be empty");

  expect(
    (
      await parseWebstudioJsxFragment(
        `<ws.element ws:tag="section"><$.Heading>Semantic Section</$.Heading></ws.element>`
      )
    ).instances[0]
  ).toEqual(
    expect.objectContaining({
      component: "ws:element",
      tag: "section",
    })
  );
});

test("allows html and fragment syntax inside text values", async () => {
  expect(
    (await parseWebstudioJsxFragment(`<$.CodeText>{"<div>"}</$.CodeText>`))
      .instances[0]?.children
  ).toEqual([{ type: "text", value: "<div>" }]);
  expect(
    (await parseWebstudioJsxFragment(`<$.Paragraph>{"<>"}</$.Paragraph>`))
      .instances[0]?.children
  ).toEqual([{ type: "text", value: "<>" }]);
  expect(
    (
      await parseWebstudioJsxFragment(
        `<$.CodeText>{'ws:id="demo"'}</$.CodeText>`
      )
    ).instances[0]?.children
  ).toEqual([{ type: "text", value: 'ws:id="demo"' }]);
  expect(
    (
      await parseWebstudioJsxFragment(
        `<$.CodeText>{'ws:style="demo"'}</$.CodeText>`
      )
    ).instances[0]?.children
  ).toEqual([{ type: "text", value: 'ws:style="demo"' }]);
  expect(
    (
      await parseWebstudioJsxFragment(
        `<$.CodeText>{\`\nimport { Box } from "x";\nexport default Box;\n\`}</$.CodeText>`
      )
    ).instances[0]?.children
  ).toEqual([
    {
      type: "text",
      value: '\nimport { Box } from "x";\nexport default Box;\n',
    },
  ]);
});

test("suggests built-in helpers for unknown jsx identifiers", async () => {
  await expect(parseWebstudioJsxFragment(`<Box />`)).rejects.toThrow(
    "Use built-in helpers only: $, ws, radix, animation, css, token, expression, Variable, Parameter, ResourceValue, ActionValue, AssetValue, PageValue, and PlaceholderValue. Box is not defined"
  );
});

test("rejects empty webstudio jsx fragments", async () => {
  await expect(parseWebstudioJsxFragment("")).rejects.toThrow(
    "JSX fragment must contain at least one Webstudio component"
  );
  await expect(parseWebstudioJsxFragment("{null}")).rejects.toThrow(
    "JSX fragment must contain at least one Webstudio component"
  );
});

test("does not treat deprecated catalog status as fragment invalidity", async () => {
  const parent = createParent();
  const fragment = await parseWebstudioJsxFragment(`<$.Box />`);

  const mutation = insertFragment(
    createState(parent),
    {
      parentInstanceId: parent.id,
      fragment,
    },
    {
      createId: createIdFactory(),
    }
  );

  expect(getAddedValues<Instance>(mutation, "instances")).toEqual([
    expect.objectContaining({
      component: "Box",
    }),
  ]);
});

test("does not treat hidden catalog status as component invalidity", async () => {
  const component = "test:ConcealedWidget";
  const previousMeta = componentMetas.get(component);
  const templates = getComponentTemplates();
  const previousTemplate = templates.get(component);
  componentMetas.set(component, {
    category: "hidden",
    label: "Concealed Widget",
    contentModel: {
      category: "instance",
      children: ["instance"],
    },
    props: {},
  } satisfies WsComponentMeta);
  templates.set(component, {
    category: "general",
    template: {
      ...createEmptyWebstudioFragment(),
      children: [{ type: "id", value: "template-root" }],
      instances: [
        {
          type: "instance",
          id: "template-root",
          component,
          children: [],
        },
      ],
    },
  });

  try {
    const parent = createParent();
    const mutation = insertComponent(
      createState(parent),
      {
        parentInstanceId: parent.id,
        component,
      },
      {
        createId: createIdFactory(),
      }
    );

    expect(getAddedValues<Instance>(mutation, "instances")).toContainEqual(
      expect.objectContaining({
        component,
      })
    );
  } finally {
    if (previousMeta === undefined) {
      componentMetas.delete(component);
    } else {
      componentMetas.set(component, previousMeta);
    }
    if (previousTemplate === undefined) {
      templates.delete(component);
    } else {
      templates.set(component, previousTemplate);
    }
  }
});

test("rejects xml components in html webstudio jsx fragments", async () => {
  const parent = createParent();
  const fragment = await parseWebstudioJsxFragment(`<$.XmlNode />`);

  expect(() =>
    insertFragment(
      createState(parent),
      {
        parentInstanceId: parent.id,
        fragment,
      },
      {
        createId: createIdFactory(),
      }
    )
  ).toThrow(
    'XML component "XmlNode" can only be inserted on pages with document type "xml"'
  );
});

test("inserts svg icon embeds with explicit icon layout styles", async () => {
  const parent = createParent();
  const mutation = await insertComponent(
    createState(parent),
    {
      parentInstanceId: parent.id,
      component: "YouTube",
    },
    {
      createId: createIdFactory(),
    }
  );

  const addedInstances = getAddedValues<Instance>(mutation, "instances");
  const htmlEmbedIds = new Set(
    addedInstances
      .filter((instance) => instance.component === "HtmlEmbed")
      .map((instance) => instance.id)
  );
  expect(htmlEmbedIds.size).toBe(2);

  const iconCodeProps = getAddedValues<{
    instanceId: string;
    name: string;
    type: string;
    value: string;
  }>(mutation, "props").filter(
    (prop) =>
      htmlEmbedIds.has(prop.instanceId) &&
      prop.name === "code" &&
      prop.type === "string"
  );
  expect(iconCodeProps.map((prop) => prop.value)).toEqual([
    expect.stringMatching(/^<svg\b/),
    expect.stringMatching(/^<svg\b/),
  ]);

  const iconStyleSourceIds = new Set(
    getAddedValues<{ instanceId: string; values: string[] }>(
      mutation,
      "styleSourceSelections"
    )
      .filter((selection) => htmlEmbedIds.has(selection.instanceId))
      .flatMap((selection) => selection.values)
  );
  expect(iconStyleSourceIds.size).toBe(2);

  const iconStyles = getAddedValues<{
    styleSourceId: string;
    property: string;
    value: unknown;
  }>(mutation, "styles").filter((style) =>
    iconStyleSourceIds.has(style.styleSourceId)
  );
  expect(iconStyles).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        property: "display",
        value: { type: "keyword", value: "block" },
      }),
      expect.objectContaining({ property: "width" }),
      expect.objectContaining({ property: "height" }),
      expect.objectContaining({ property: "lineHeight" }),
    ])
  );
});

test("inserts core component templates with text content", async () => {
  const parent = createParent();
  const mutation = await insertComponent(
    createState(parent),
    {
      parentInstanceId: parent.id,
      component: "button",
    },
    {
      createId: createIdFactory(),
    }
  );

  const [insertedInstance] = getAddedValues<Instance>(
    mutation,
    "instances"
  ).filter((instance) => instance.component === elementComponent);
  expect(insertedInstance).toEqual(
    expect.objectContaining({
      component: elementComponent,
      tag: "button",
      children: [{ type: "text", value: "Button", placeholder: true }],
    })
  );
});

test("inserts component templates with hidden internal descendants", async () => {
  const parent = createParent();
  const mutation = await insertComponent(
    createState(parent),
    {
      parentInstanceId: parent.id,
      component: "@webstudio-is/sdk-components-react-radix:Accordion",
    },
    {
      createId: createIdFactory(),
    }
  );

  const addedComponents = getAddedValues<Instance>(mutation, "instances").map(
    (instance) => instance.component
  );

  expect(addedComponents).toContain(
    "@webstudio-is/sdk-components-react-radix:Accordion"
  );
  expect(addedComponents).toContain("Text");
});

test("inserts single instance for components without templates", async () => {
  const parent = createParent();
  const mutation = await insertComponent(
    createState(parent),
    {
      parentInstanceId: parent.id,
      component: "custom:Widget",
    },
    {
      createId: createIdFactory(),
    }
  );

  expect(mutation.result.rootInstanceIds).toEqual(["generated-1"]);
  expect(mutation.result.instanceIds).toEqual(["generated-1"]);
  const instancePatches =
    mutation.payload.find((change) => change.namespace === "instances")
      ?.patches ?? [];
  expect(instancePatches).toContainEqual({
    op: "add",
    path: ["generated-1"],
    value: {
      type: "instance",
      id: "generated-1",
      component: "custom:Widget",
      children: [],
    },
  });
});

test("rejects known provider child components without standalone templates", async () => {
  const parent = createParent();

  expect(() =>
    insertComponent(
      createState(parent),
      {
        parentInstanceId: parent.id,
        component: "@webstudio-is/sdk-components-react-radix:CheckboxIndicator",
      },
      {
        createId: createIdFactory(),
      }
    )
  ).toThrow(
    'Insert one of these template/root components instead: "@webstudio-is/sdk-components-react-radix:Checkbox"'
  );
});

test.each(["AnimateText", "StaggerAnimation"])(
  "inserts animation part %s into an Animation Group",
  (name) => {
    const parent: Instance = {
      type: "instance",
      id: "animation-group",
      component: "@webstudio-is/sdk-components-animation:AnimateChildren",
      children: [],
    };
    const component = `@webstudio-is/sdk-components-animation:${name}`;

    const mutation = insertComponent(
      createState(parent),
      {
        parentInstanceId: parent.id,
        component,
      },
      {
        createId: createIdFactory(),
      }
    );

    expect(getAddedValues<Instance>(mutation, "instances")).toContainEqual(
      expect.objectContaining({ component })
    );
  }
);

test("inserts a component part allowed by an ancestor content model", () => {
  const parent = createParent();
  const ancestor: Instance = {
    type: "instance",
    id: "checkbox",
    component: "@webstudio-is/sdk-components-react-radix:Checkbox",
    children: [{ type: "id", value: parent.id }],
  };
  const component =
    "@webstudio-is/sdk-components-react-radix:CheckboxIndicator";
  const state = createState(ancestor);
  state.instances.set(parent.id, parent);

  const mutation = insertComponent(
    state,
    {
      parentInstanceId: parent.id,
      component,
    },
    {
      createId: createIdFactory(),
    }
  );

  expect(getAddedValues<Instance>(mutation, "instances")).toContainEqual(
    expect.objectContaining({ component })
  );
});

test("rejects native option outside select and suggests select", async () => {
  const parent = createParent();

  expect(() =>
    insertComponent(
      createState(parent),
      {
        parentInstanceId: parent.id,
        component: "Option",
      },
      {
        createId: createIdFactory(),
      }
    )
  ).toThrow('Insert one of these template/root components instead: "Select"');
});

test("inserts native select as a single instance without story templates", async () => {
  const parent = createParent();
  const mutation = await insertComponent(
    createState(parent),
    {
      parentInstanceId: parent.id,
      component: "Select",
    },
    {
      createId: createIdFactory(),
    }
  );

  const addedInstances = (
    mutation.payload.find((change) => change.namespace === "instances")
      ?.patches ?? []
  ).flatMap((patch) =>
    patch.op === "add" && patch.path.length === 1
      ? [patch.value as Instance]
      : []
  );

  expect(addedInstances.map((instance) => instance.component)).toEqual([
    "Select",
  ]);
  expect(mutation.result.rootInstanceIds).toEqual(["generated-1"]);
  expect(mutation.result.instanceIds).toEqual(["generated-1"]);
});

test("suggests root templates for nested provider child components", async () => {
  const parent = createParent();

  expect(() =>
    insertComponent(
      createState(parent),
      {
        parentInstanceId: parent.id,
        component:
          "@webstudio-is/sdk-components-react-radix:SelectItemIndicator",
      },
      {
        createId: createIdFactory(),
      }
    )
  ).toThrow(
    'Insert one of these template/root components instead: "@webstudio-is/sdk-components-react-radix:Select"'
  );
});

test("inserts fallback instance for unknown custom components", async () => {
  const parent = createParent();
  const mutation = await insertComponent(
    createState(parent),
    {
      parentInstanceId: parent.id,
      component: "custom:Widget",
    },
    {
      createId: createIdFactory(),
    }
  );

  expect(mutation.result.rootInstanceIds).toEqual(["generated-1"]);
  const instancePatches =
    mutation.payload.find((change) => change.namespace === "instances")
      ?.patches ?? [];
  expect(instancePatches).toContainEqual({
    op: "add",
    path: ["generated-1"],
    value: {
      type: "instance",
      id: "generated-1",
      component: "custom:Widget",
      children: [],
    },
  });
});

test("does not treat known hidden components as invalidity", async () => {
  const parent = createParent();

  const mutation = insertComponent(
    createState(parent),
    {
      parentInstanceId: parent.id,
      component: "Body",
    },
    {
      createId: createIdFactory(),
    }
  );

  expect(getAddedValues<Instance>(mutation, "instances")).toContainEqual(
    expect.objectContaining({
      component: "Body",
    })
  );
});

test("does not treat known deprecated components as invalidity", async () => {
  const parent = createParent();

  const mutation = insertComponent(
    createState(parent),
    {
      parentInstanceId: parent.id,
      component: "Box",
    },
    {
      createId: createIdFactory(),
    }
  );

  expect(getAddedValues<Instance>(mutation, "instances")).toContainEqual(
    expect.objectContaining({
      component: "Box",
    })
  );
});

test("rejects xml components outside xml documents", async () => {
  const parent = createParent();

  expect(() =>
    insertComponent(
      createState(parent),
      {
        parentInstanceId: parent.id,
        component: "XmlNode",
      },
      {
        createId: createIdFactory(),
      }
    )
  ).toThrow(
    'XML component "XmlNode" can only be inserted on pages with document type "xml"'
  );

  expect(() =>
    insertComponent(
      createState(parent, "text"),
      {
        parentInstanceId: parent.id,
        component: "XmlTime",
      },
      {
        createId: createIdFactory(),
      }
    )
  ).toThrow(
    'XML component "XmlTime" can only be inserted on pages with document type "xml"'
  );
});

test("inserts xml components into xml documents", async () => {
  const parent = createParent();
  const mutation = await insertComponent(
    createState(parent, "xml"),
    {
      parentInstanceId: parent.id,
      component: "XmlNode",
    },
    {
      createId: createIdFactory(),
    }
  );

  expect(mutation.result.rootInstanceIds).toEqual(["generated-1"]);
});

test("inserts into instances without children field", async () => {
  const parent = {
    type: "instance",
    id: "parent",
    component: elementComponent,
  } as Instance;
  const mutation = await insertComponent(
    createState(parent),
    {
      parentInstanceId: parent.id,
      component: "custom:Widget",
    },
    {
      createId: createIdFactory(),
    }
  );

  expect(mutation.result.rootInstanceIds).toEqual(["generated-1"]);
  const instancePatches =
    mutation.payload.find((change) => change.namespace === "instances")
      ?.patches ?? [];
  expect(instancePatches).toContainEqual({
    op: "add",
    path: ["parent", "children"],
    value: [{ type: "id", value: "generated-1" }],
  });
});

test("rejects generated id collisions", async () => {
  const parent = createParent();
  const state = createState(parent);
  state.instances.set("generated-1", {
    type: "instance",
    id: "generated-1",
    component: "custom:Existing",
    children: [],
  });

  expect(() =>
    insertComponent(
      state,
      {
        parentInstanceId: parent.id,
        component: "custom:Widget",
      },
      {
        createId: createIdFactory(),
      }
    )
  ).toThrow('Generated instance id "generated-1" already exists');
});
