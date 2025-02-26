import { enableMapSet } from "immer";
import { describe, test, expect, beforeEach } from "vitest";
import type { Project } from "@webstudio-is/project";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  $,
  ws,
  expression,
  renderTemplate,
  renderData,
  ResourceValue,
} from "@webstudio-is/template";
import * as defaultMetas from "@webstudio-is/sdk-components-react/metas";
import * as radixMetas from "@webstudio-is/sdk-components-react-radix/metas";
import type {
  Asset,
  Breakpoint,
  Instance,
  Instances,
  Prop,
  StyleDecl,
  StyleDeclKey,
  StyleSource,
  WebstudioData,
  WebstudioFragment,
  WsComponentMeta,
} from "@webstudio-is/sdk";
import {
  coreMetas,
  portalComponent,
  collectionComponent,
} from "@webstudio-is/sdk";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-engine";
import {
  findClosestEditableInstanceSelector,
  deleteInstanceMutable,
  extractWebstudioFragment,
  insertWebstudioFragmentCopy,
  reparentInstance,
  getWebstudioData,
  insertInstanceChildrenMutable,
  findClosestInsertable,
  insertWebstudioFragmentAt,
} from "./instance-utils";
import {
  $assets,
  $breakpoints,
  $dataSources,
  $instances,
  $pages,
  $project,
  $props,
  $styleSourceSelections,
  $styleSources,
  $styles,
  $registeredComponentMetas,
  $resources,
} from "./nano-states";
import { registerContainers } from "./sync";
import { $awareness, getInstancePath, selectInstance } from "./awareness";

enableMapSet();
registerContainers();

$pages.set(createDefaultPages({ rootInstanceId: "" }));

const defaultMetasMap = new Map(
  Object.entries({ ...defaultMetas, ...coreMetas })
);
$registeredComponentMetas.set(defaultMetasMap);

const createFragment = (
  fragment: Partial<WebstudioFragment>
): WebstudioFragment => ({
  children: [],
  instances: [],
  styleSourceSelections: [],
  styleSources: [],
  breakpoints: [],
  styles: [],
  dataSources: [],
  resources: [],
  props: [],
  assets: [],
  ...fragment,
});

const createFakeComponentMetas = (
  itemMeta: Partial<WsComponentMeta>,
  anotherItemMeta?: Partial<WsComponentMeta>
): Map<string, WsComponentMeta> => {
  const base = {
    label: "",
    Icon: () => null,
  };
  const configs = {
    Item: { ...base, type: "container", ...itemMeta },
    AnotherItem: { ...base, type: "container", ...anotherItemMeta },
    Bold: { ...base, type: "rich-text-child" },
    Text: { ...base, type: "container" },
    Form: { ...base, type: "container" },
    Box: { ...base, type: "container" },
    Div: { ...base, type: "container" },
    Body: { ...base, type: "container" },
  } as const;
  return new Map(Object.entries(configs)) as Map<string, WsComponentMeta>;
};

const getIdValuePair = <T extends { id: string }>(item: T) =>
  [item.id, item] as const;

const toMap = <T extends { id: string }>(list: T[]) =>
  new Map(list.map(getIdValuePair));

const createInstance = (
  id: Instance["id"],
  component: string,
  children: Instance["children"]
): Instance => {
  return { type: "instance", id, component, children };
};

const createStyleDecl = (
  styleSourceId: string,
  breakpointId: string,
  property: StyleProperty,
  value: StyleValue | string
): StyleDecl => ({
  styleSourceId,
  breakpointId,
  property,
  value: typeof value === "string" ? { type: "unparsed", value } : value,
});

const createStyleDeclPair = (
  styleSourceId: string,
  breakpointId: string,
  property: StyleProperty,
  value: StyleValue | string
): [StyleDeclKey, StyleDecl] => [
  `${styleSourceId}:${breakpointId}:${property}:`,
  createStyleDecl(styleSourceId, breakpointId, property, value),
];

const createImageAsset = (id: string, name = "", projectId = ""): Asset => {
  return {
    id,
    type: "image",
    format: "",
    name,
    description: "",
    projectId,
    createdAt: "",
    size: 0,
    meta: { width: 0, height: 0 },
  };
};

const createFontAsset = (id: string, family: string): Asset => {
  return {
    id,
    type: "font",
    format: "woff",
    name: "",
    description: "",
    projectId: "",
    createdAt: "",
    size: 0,
    meta: { style: "normal", family, variationAxes: {} },
  };
};

describe("find closest editable instance selector", () => {
  test("searches closest container", () => {
    const instances: Instances = toMap([
      createInstance("body", "Body", [{ type: "id", value: "box" }]),
      createInstance("box", "Box", [
        { type: "text", value: "some text" },
        { type: "id", value: "bold" },
      ]),
      createInstance("bold", "Bold", [{ type: "text", value: "some-bold" }]),
    ]);
    expect(
      findClosestEditableInstanceSelector(
        ["bold", "box", "body"],
        instances,
        createFakeComponentMetas({})
      )
    ).toEqual(["box", "body"]);
    expect(
      findClosestEditableInstanceSelector(
        ["box", "body"],
        instances,
        createFakeComponentMetas({})
      )
    ).toEqual(["box", "body"]);
  });

  test("skips when container has anything except rich-text-child or text", () => {
    const instances: Instances = toMap([
      createInstance("body", "Body", [{ type: "id", value: "box" }]),
      createInstance("box", "Box", [
        { type: "text", value: "some text" },
        { type: "id", value: "bold" },
        { type: "id", value: "child-box" },
      ]),
      createInstance("bold", "Bold", [{ type: "text", value: "some-bold" }]),
      createInstance("child-box", "Box", [
        { type: "text", value: "child-box" },
      ]),
    ]);
    expect(
      findClosestEditableInstanceSelector(
        ["bold", "box", "body"],
        instances,
        createFakeComponentMetas({})
      )
    ).toEqual(undefined);
  });

  test("considers empty container as editable", () => {
    const instances: Instances = toMap([
      createInstance("body", "Body", [{ type: "id", value: "body" }]),
      createInstance("box", "Box", []),
    ]);
    expect(
      findClosestEditableInstanceSelector(
        ["box", "body"],
        instances,
        createFakeComponentMetas({})
      )
    ).toEqual(["box", "body"]);
  });

  test("prevent editing Body instance", () => {
    const instances: Instances = toMap([createInstance("body", "Body", [])]);
    expect(
      findClosestEditableInstanceSelector(
        ["body"],
        instances,
        createFakeComponentMetas({})
      )
    ).toEqual(undefined);
  });
});

describe("insert instance children", () => {
  test("insert instance children into empty target", () => {
    const instances = toMap([createInstance("body", "Body", [])]);
    const data = getWebstudioDataStub({ instances });
    insertInstanceChildrenMutable(data, [{ type: "id", value: "box" }], {
      parentSelector: ["body"],
      position: "end",
    });
    expect(data.instances).toEqual(
      toMap([createInstance("body", "Body", [{ type: "id", value: "box" }])])
    );
  });

  test("insert instance children into the end of target", () => {
    const instances = toMap([
      createInstance("body", "Body", [{ type: "id", value: "text" }]),
    ]);
    const data = getWebstudioDataStub({ instances });
    insertInstanceChildrenMutable(data, [{ type: "id", value: "box" }], {
      parentSelector: ["body"],
      position: "end",
    });
    expect(data.instances).toEqual(
      toMap([
        createInstance("body", "Body", [
          { type: "id", value: "text" },
          { type: "id", value: "box" },
        ]),
      ])
    );
  });

  test("insert instance children into the start of target", () => {
    const instances = toMap([
      createInstance("body", "Body", [{ type: "id", value: "text" }]),
    ]);
    const data = getWebstudioDataStub({ instances });
    insertInstanceChildrenMutable(data, [{ type: "id", value: "box" }], {
      parentSelector: ["body"],
      position: 0,
    });
    expect(data.instances).toEqual(
      toMap([
        createInstance("body", "Body", [
          { type: "id", value: "box" },
          { type: "id", value: "text" },
        ]),
      ])
    );
  });

  test("insert instance children at the start of text", () => {
    const instances = toMap([
      createInstance("body", "Body", [{ type: "id", value: "text" }]),
      createInstance("text", "Text", [{ type: "text", value: "text" }]),
    ]);
    const data = getWebstudioDataStub({ instances });
    insertInstanceChildrenMutable(data, [{ type: "id", value: "box" }], {
      parentSelector: ["text", "body"],
      position: 0,
    });
    const [_bodyId, _textId, spanId] = data.instances.keys();
    expect(data.instances).toEqual(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "text" }]),
        createInstance("text", "Text", [
          { type: "id", value: "box" },
          { type: "id", value: spanId },
        ]),
        createInstance(spanId, "Text", [{ type: "text", value: "text" }]),
      ])
    );
    expect(data.props).toEqual(
      toMap<Prop>([
        {
          id: expect.any(String) as unknown as string,
          instanceId: spanId,
          name: "tag",
          type: "string",
          value: "span",
        },
      ])
    );
  });

  test("insert instance children at the end of text", () => {
    const instances = toMap([
      createInstance("body", "Body", [{ type: "id", value: "text" }]),
      createInstance("text", "Text", [{ type: "text", value: "text" }]),
    ]);
    const data = getWebstudioDataStub({ instances });
    insertInstanceChildrenMutable(data, [{ type: "id", value: "box" }], {
      parentSelector: ["text", "body"],
      position: "end",
    });
    const [_bodyId, _textId, spanId] = data.instances.keys();
    expect(data.instances).toEqual(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "text" }]),
        createInstance("text", "Text", [
          { type: "id", value: spanId },
          { type: "id", value: "box" },
        ]),
        createInstance(spanId, "Text", [{ type: "text", value: "text" }]),
      ])
    );
    expect(data.props).toEqual(
      toMap<Prop>([
        {
          id: expect.any(String) as unknown as string,
          instanceId: spanId,
          name: "tag",
          type: "string",
          value: "span",
        },
      ])
    );
  });

  test("insert instance children between text children", () => {
    const instances = toMap([
      createInstance("body", "Body", [{ type: "id", value: "text" }]),
      createInstance("text", "Text", [
        { type: "id", value: "bold" },
        { type: "text", value: "text" },
        { type: "id", value: "italic" },
      ]),
      createInstance("bold", "Bold", [{ type: "text", value: "bold" }]),
      createInstance("italic", "Italic", [{ type: "text", value: "italic" }]),
    ]);
    const data = getWebstudioDataStub({ instances });
    insertInstanceChildrenMutable(data, [{ type: "id", value: "box" }], {
      parentSelector: ["text", "body"],
      position: 1,
    });
    const [_bodyId, _textId, _boldId, _italicId, leftSpanId, rightSpanId] =
      data.instances.keys();
    expect(data.instances).toEqual(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "text" }]),
        createInstance("text", "Text", [
          { type: "id", value: leftSpanId },
          { type: "id", value: "box" },
          { type: "id", value: rightSpanId },
        ]),
        createInstance("bold", "Bold", [{ type: "text", value: "bold" }]),
        createInstance("italic", "Italic", [{ type: "text", value: "italic" }]),
        createInstance(leftSpanId, "Text", [{ type: "id", value: "bold" }]),
        createInstance(rightSpanId, "Text", [
          { type: "text", value: "text" },
          { type: "id", value: "italic" },
        ]),
      ])
    );
    expect(data.props).toEqual(
      toMap<Prop>([
        {
          id: expect.any(String) as unknown as string,
          instanceId: leftSpanId,
          name: "tag",
          type: "string",
          value: "span",
        },
        {
          id: expect.any(String) as unknown as string,
          instanceId: rightSpanId,
          name: "tag",
          type: "string",
          value: "span",
        },
      ])
    );
  });
});

describe("insert webstudio fragment at", () => {
  beforeEach(() => {
    $styleSourceSelections.set(new Map());
    $styleSources.set(new Map());
    $breakpoints.set(new Map());
    $styles.set(new Map());
    $dataSources.set(new Map());
    $resources.set(new Map());
    $props.set(new Map());
    $assets.set(new Map());
  });

  test("insert multiple instances", () => {
    $instances.set(renderData(<$.Body ws:id="bodyId"></$.Body>).instances);
    insertWebstudioFragmentAt(
      renderTemplate(
        <>
          <$.Heading ws:id="headingId"></$.Heading>
          <$.Paragraph ws:id="paragraphId"></$.Paragraph>
        </>
      ),
      {
        parentSelector: ["bodyId"],
        position: "end",
      }
    );
    expect($instances.get()).toEqual(
      renderData(
        <$.Body ws:id="bodyId">
          <$.Heading ws:id={expect.any(String)}></$.Heading>
          <$.Paragraph ws:id={expect.any(String)}></$.Paragraph>
        </$.Body>
      ).instances
    );
  });

  test("insert fragment after insertable", () => {
    $instances.set(
      renderData(
        <$.Body ws:id="bodyId">
          <$.Box ws:id="boxId"></$.Box>
        </$.Body>
      ).instances
    );
    insertWebstudioFragmentAt(
      renderTemplate(<$.Heading ws:id="headingId"></$.Heading>),
      {
        parentSelector: ["boxId", "bodyId"],
        position: "after",
      }
    );
    expect($instances.get()).toEqual(
      renderData(
        <$.Body ws:id="bodyId">
          <$.Box ws:id="boxId"></$.Box>
          <$.Heading ws:id={expect.any(String)}></$.Heading>
        </$.Body>
      ).instances
    );
  });

  test("insert fragment inside of body when configured to place after insertable", () => {
    $instances.set(renderData(<$.Body ws:id="bodyId"></$.Body>).instances);
    insertWebstudioFragmentAt(
      renderTemplate(<$.Heading ws:id="headingId"></$.Heading>),
      {
        parentSelector: ["bodyId"],
        position: "after",
      }
    );
    expect($instances.get()).toEqual(
      renderData(
        <$.Body ws:id="bodyId">
          <$.Heading ws:id={expect.any(String)}></$.Heading>
        </$.Body>
      ).instances
    );
  });
});

describe("reparent instance", () => {
  test("between instances", () => {
    // body
    //   box
    //     text
    //   button
    $instances.set(
      toMap([
        createInstance("body", "Body", [
          { type: "id", value: "box" },
          { type: "id", value: "button" },
        ]),
        createInstance("box", "Box", [{ type: "id", value: "text" }]),
        createInstance("button", "Button", []),
        createInstance("text", "Text", []),
      ])
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentInstance(["text", "box", "body"], {
      parentSelector: ["body"],
      position: 1,
    });
    const instances = $instances.get();
    const newTextId = instances.get("body")?.children[1].value as string;
    // body
    //   box
    //   text
    //   button
    expect(instances).toEqual(
      toMap([
        createInstance("body", "Body", [
          { type: "id", value: "box" },
          { type: "id", value: newTextId },
          { type: "id", value: "button" },
        ]),
        createInstance("box", "Box", []),
        createInstance("button", "Button", []),
        createInstance(newTextId, "Text", []),
      ])
    );
  });

  test("to the end", () => {
    // body
    //   box
    //     text
    $instances.set(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "box" }]),
        createInstance("box", "Box", [{ type: "id", value: "text" }]),
        createInstance("text", "Text", []),
      ])
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentInstance(["text", "box", "body"], {
      parentSelector: ["body"],
      position: "end",
    });
    const instances = $instances.get();
    const newTextId = instances.get("body")?.children[1].value as string;
    // body
    //   box
    //   text
    expect(instances).toEqual(
      toMap([
        createInstance("body", "Body", [
          { type: "id", value: "box" },
          { type: "id", value: newTextId },
        ]),
        createInstance("box", "Box", []),
        createInstance(newTextId, "Text", []),
      ])
    );
  });

  test("wrap with fragment when reparent into empty portal", () => {
    // body
    //   portal
    //   box
    $instances.set(
      toMap([
        createInstance("body", "Body", [
          { type: "id", value: "portal" },
          { type: "id", value: "box" },
        ]),
        createInstance("portal", portalComponent, []),
        createInstance("box", "Box", []),
      ])
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentInstance(["box", "body"], {
      parentSelector: ["portal", "body"],
      position: "end",
    });
    const instances = $instances.get();
    const newFragmentId = instances.get("portal")?.children[0].value as string;
    const newBoxId = instances.get(newFragmentId)?.children[0].value as string;
    // body
    //   portal
    //     fragment
    //       box
    expect(instances).toEqual(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "portal" }]),
        createInstance("portal", portalComponent, [
          { type: "id", value: newFragmentId },
        ]),
        createInstance(newFragmentId, "Fragment", [
          { type: "id", value: newBoxId },
        ]),
        createInstance(newBoxId, "Box", []),
      ])
    );
  });

  test("reuse existing fragment when reparent into portal", () => {
    // body
    //   portal
    //     fragment
    //   box
    $instances.set(
      toMap([
        createInstance("body", "Body", [
          { type: "id", value: "portal" },
          { type: "id", value: "box" },
        ]),
        createInstance("portal", portalComponent, [
          { type: "id", value: "fragment" },
        ]),
        createInstance("fragment", "Fragment", []),
        createInstance("box", "Box", []),
      ])
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentInstance(["box", "body"], {
      parentSelector: ["portal", "body"],
      position: "end",
    });
    const instances = $instances.get();
    const newBoxId = instances.get("fragment")?.children[0].value as string;
    // body
    //   portal
    //     fragment
    //       box
    expect(instances).toEqual(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "portal" }]),
        createInstance("portal", portalComponent, [
          { type: "id", value: "fragment" },
        ]),
        createInstance("fragment", "Fragment", [
          { type: "id", value: newBoxId },
        ]),
        createInstance(newBoxId, "Box", []),
      ])
    );
  });

  test("prevent portal reparenting into own children to avoid infinite loop", () => {
    // body
    //   portal
    //     fragment
    $instances.set(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "portal" }]),
        createInstance("portal", portalComponent, [
          { type: "id", value: "fragment" },
        ]),
        createInstance("fragment", "Fragment", []),
      ])
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentInstance(["portal", "body"], {
      parentSelector: ["fragment", "portal", "body"],
      position: "end",
    });
    const instances = $instances.get();
    // body
    //   portal
    //     fragment
    expect(instances).toEqual(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "portal" }]),
        createInstance("portal", portalComponent, [
          { type: "id", value: "fragment" },
        ]),
        createInstance("fragment", "Fragment", []),
      ])
    );
  });

  test("from collection item", () => {
    // body
    //   list
    //     box
    $instances.set(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "list" }]),
        createInstance("list", collectionComponent, [
          { type: "id", value: "box" },
        ]),
        createInstance("box", "Box", []),
      ])
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentInstance(["box", "list[0]", "list", "body"], {
      parentSelector: ["body"],
      position: "end",
    });
    const instances = $instances.get();
    const newBoxId = instances.get("body")?.children[1].value as string;
    // body
    //   list
    //   box
    expect(instances).toEqual(
      toMap([
        createInstance("body", "Body", [
          { type: "id", value: "list" },
          { type: "id", value: newBoxId },
        ]),
        createInstance("list", collectionComponent, []),
        createInstance(newBoxId, "Box", []),
      ])
    );
  });

  test("reparent required child", () => {
    $instances.set(
      renderData(
        <$.Body ws:id="body">
          <$.Tooltip ws:id="tooltip">
            <$.TooltipTrigger ws:id="trigger"></$.TooltipTrigger>
            <$.TooltipContent ws:id="content"></$.TooltipContent>
          </$.Tooltip>
        </$.Body>
      ).instances
    );
    $registeredComponentMetas.set(
      new Map(Object.entries({ ...defaultMetas, ...radixMetas }))
    );
    reparentInstance(["trigger", "tooltip", "body"], {
      parentSelector: ["tooltip", "body"],
      position: "end",
    });
    expect($instances.get()).toEqual(
      renderData(
        <$.Body ws:id="body">
          <$.Tooltip ws:id="tooltip">
            <$.TooltipContent ws:id="content"></$.TooltipContent>
            <$.TooltipTrigger ws:id={expect.any(String)}></$.TooltipTrigger>
          </$.Tooltip>
        </$.Body>
      ).instances
    );
  });
});

const getWebstudioDataStub = (
  data?: Partial<WebstudioData>
): WebstudioData => ({
  pages: createDefaultPages({ rootInstanceId: "" }),
  assets: new Map(),
  dataSources: new Map(),
  resources: new Map(),
  instances: new Map(),
  props: new Map(),
  breakpoints: new Map(),
  styleSourceSelections: new Map(),
  styleSources: new Map(),
  styles: new Map(),
  ...data,
});

describe("delete instance", () => {
  test("delete instance with its children", () => {
    const data = renderData(
      <$.Body ws:id="bodyId">
        <$.Box ws:id="boxId">
          <$.Box ws:id="sectionId"></$.Box>
        </$.Box>
        <$.Box ws:id="divId"></$.Box>
      </$.Body>
    );
    expect(data.instances.size).toEqual(4);
    expect(data.instances.get("bodyId")?.children.length).toEqual(2);
    deleteInstanceMutable(
      data,
      // clone to make sure data is mutated instead of instance path
      structuredClone(getInstancePath(["boxId", "bodyId"], data.instances))
    );
    expect(data.instances.size).toEqual(2);
    expect(data.instances.get("bodyId")?.children.length).toEqual(1);
  });

  test("delete instance from collection", () => {
    const data = renderData(
      <$.Body ws:id="bodyId">
        <ws.collection ws:id="collectionId">
          <$.Box ws:id="boxId"></$.Box>
        </ws.collection>
      </$.Body>
    );
    expect(data.instances.size).toEqual(3);
    expect(data.instances.get("collectionId")?.children.length).toEqual(1);
    deleteInstanceMutable(
      data,
      getInstancePath(
        ["boxId", "collectionId[0]", "collectionId", "bodyId"],
        data.instances
      )
    );
    expect(data.instances.size).toEqual(2);
    expect(data.instances.get("collectionId")?.children.length).toEqual(0);
  });

  test("delete instance from collection item", () => {
    const data = renderData(
      <$.Body ws:id="bodyId">
        <ws.collection ws:id="collectionId">
          <$.Box ws:id="boxId">
            <$.Text ws:id="textId"></$.Text>
          </$.Box>
        </ws.collection>
      </$.Body>
    );
    expect(data.instances.size).toEqual(4);
    expect(data.instances.get("boxId")?.children.length).toEqual(1);
    deleteInstanceMutable(
      data,
      getInstancePath(
        ["textId", "boxId", "collectionId[0]", "collectionId", "bodyId"],
        data.instances
      )
    );
    expect(data.instances.size).toEqual(3);
    expect(data.instances.get("boxId")?.children.length).toEqual(0);
  });

  test("delete resource bound to variable", () => {
    const myResource = new ResourceValue("My Resource", {
      url: expression`""`,
      method: "get",
      headers: [],
    });
    const data = renderData(
      <$.Body ws:id="bodyId">
        <$.Box ws:id="boxId" vars={expression`${myResource}`}></$.Box>
      </$.Body>
    );
    expect(data.resources.size).toEqual(1);
    expect(data.dataSources.size).toEqual(1);
    deleteInstanceMutable(
      data,
      getInstancePath(["boxId", "bodyId"], data.instances)
    );
    expect(data.resources.size).toEqual(0);
    expect(data.dataSources.size).toEqual(0);
  });

  test("delete resource bound to prop", () => {
    const myResource = new ResourceValue("My Resource", {
      url: expression`""`,
      method: "get",
      headers: [],
    });
    const data = renderData(
      <$.Body ws:id="bodyId">
        <$.Box ws:id="boxId" action={myResource}></$.Box>
      </$.Body>
    );
    expect(data.resources.size).toEqual(1);
    expect(data.props.size).toEqual(1);
    deleteInstanceMutable(
      data,
      getInstancePath(["boxId", "bodyId"], data.instances)
    );
    expect(data.resources.size).toEqual(0);
    expect(data.props.size).toEqual(0);
  });

  test("delete unknown instance (just in case)", () => {
    const data = renderData(
      <$.Body ws:id="bodyId">
        <$.Invalid ws:id="invalidId"></$.Invalid>
      </$.Body>
    );
    expect(data.instances.size).toEqual(2);
    deleteInstanceMutable(
      data,
      getInstancePath(["invalidId", "bodyId"], data.instances)
    );
    expect(data.instances.size).toEqual(1);
  });

  test("delete slot fragment along with last child", () => {
    const data = renderData(
      <$.Body ws:id="bodyId">
        <$.Slot ws:id="slotId">
          <$.Fragment ws:id="fragmentId">
            <$.Box ws:id="boxId"></$.Box>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    expect(data.instances.size).toEqual(4);
    expect(data.instances.get("fragmentId")?.children.length).toEqual(1);
    deleteInstanceMutable(
      data,
      getInstancePath(
        ["boxId", "fragmentId", "slotId", "bodyId"],
        data.instances
      )
    );
    expect(data.instances.size).toEqual(2);
    expect(data.instances.get("slotId")?.children.length).toEqual(0);
  });
});

describe("extract webstudio fragment", () => {
  test("collect all styles and breakpoints bound to fragment instances", () => {
    // body
    //   box1
    //     box2
    $instances.set(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "box1" }]),
        createInstance("box1", "Box", [{ type: "id", value: "box2" }]),
        createInstance("box2", "Box", []),
      ])
    );
    $styleSourceSelections.set(
      new Map([
        ["body", { instanceId: "box1", values: ["localBody", "token1"] }],
        ["box1", { instanceId: "box1", values: ["localBox1", "token2"] }],
        ["box2", { instanceId: "box2", values: ["localBox2", "token2"] }],
      ])
    );
    $styleSources.set(
      new Map([
        ["localBody", { id: "localBody", type: "local" }],
        ["localBox1", { id: "localBox1", type: "local" }],
        ["localBox2", { id: "localBox2", type: "local" }],
        ["token1", { id: "token1", type: "token", name: "token1" }],
        ["token2", { id: "token2", type: "token", name: "token2" }],
      ])
    );
    $styles.set(
      new Map([
        createStyleDeclPair("localBody1", "base", "color", "red"),
        createStyleDeclPair("localBox1", "base", "color", "green"),
        createStyleDeclPair("localBox2", "base", "color", "blue"),
        createStyleDeclPair("token1", "base", "color", "yellow"),
        createStyleDeclPair("token2", "base", "color", "orange"),
      ])
    );
    $breakpoints.set(
      new Map([
        ["base", { id: "base", label: "base" }],
        ["big", { id: "big", label: "big", minWidth: 768 }],
      ])
    );
    const { styleSources, styleSourceSelections, styles, breakpoints } =
      extractWebstudioFragment(getWebstudioData(), "box1");

    // exclude localBody and token1 bound to body
    expect(styleSources).toEqual([
      { id: "localBox1", type: "local" },
      { id: "token2", type: "token", name: "token2" },
      { id: "localBox2", type: "local" },
    ]);
    expect(styleSourceSelections).toEqual([
      { instanceId: "box1", values: ["localBox1", "token2"] },
      { instanceId: "box2", values: ["localBox2", "token2"] },
    ]);
    expect(styles).toEqual([
      createStyleDecl("localBox1", "base", "color", "green"),
      createStyleDecl("localBox2", "base", "color", "blue"),
      createStyleDecl("token2", "base", "color", "orange"),
    ]);
    expect(breakpoints).toEqual([{ id: "base", label: "base" }]);
  });

  test("collect assets from props and styles withiin fragment instances", () => {
    // body
    //   box1
    //     box2
    $instances.set(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "box1" }]),
        createInstance("box1", "Box", [{ type: "id", value: "box2" }]),
        createInstance("box2", "Box", []),
      ])
    );
    $props.set(
      new Map([
        [
          "bodyProp",
          {
            id: "bodyProp",
            instanceId: "body",
            name: "data-body",
            type: "asset",
            value: "asset1",
          },
        ],
        [
          "box1Prop",
          {
            id: "box1Prop",
            instanceId: "box1",
            name: "data-box1",
            type: "asset",
            value: "asset2",
          },
        ],
      ])
    );
    $styleSourceSelections.set(
      new Map([
        ["body", { instanceId: "box1", values: ["localBody"] }],
        ["box1", { instanceId: "box1", values: ["localBox1"] }],
      ])
    );
    $styleSources.set(
      new Map([
        ["localBody", { id: "localBody", type: "local" }],
        ["localBox1", { id: "localBox1", type: "local" }],
      ])
    );
    $styles.set(
      new Map([
        createStyleDeclPair("localBody1", "base", "fontFamily", {
          type: "fontFamily",
          value: ["font1"],
        }),
        createStyleDeclPair("localBody1", "base", "backgroundImage", {
          type: "image",
          value: { type: "asset", value: "asset3" },
        }),
        createStyleDeclPair("localBox1", "base", "fontFamily", {
          type: "fontFamily",
          value: ["font2"],
        }),
        createStyleDeclPair("localBox1", "base", "color", {
          type: "image",
          value: { type: "asset", value: "asset4" },
        }),
      ])
    );
    $breakpoints.set(new Map([["base", { id: "base", label: "base" }]]));
    $assets.set(
      toMap([
        createImageAsset("asset1"),
        createImageAsset("asset2"),
        createImageAsset("asset3"),
        createImageAsset("asset4"),
        createFontAsset("asset5", "font1"),
        createFontAsset("asset6", "font2"),
      ])
    );
    const { assets } = extractWebstudioFragment(getWebstudioData(), "box1");

    expect(assets).toEqual([
      createImageAsset("asset2"),
      createImageAsset("asset4"),
      createFontAsset("asset6", "font2"),
    ]);
  });
});

describe("insert webstudio fragment copy", () => {
  const emptyFragment = {
    children: [],
    instances: [
      {
        id: "body",
        type: "instance",
        component: "Body",
        children: [],
      } satisfies Instance,
    ],
    styleSourceSelections: [],
    styleSources: [],
    breakpoints: [],
    styles: [],
    dataSources: [],
    resources: [],
    props: [],
    assets: [],
  };

  $project.set({ id: "current_project" } as Project);

  beforeEach(() => {
    $assets.set(new Map());
    $breakpoints.set(new Map());
    $styleSourceSelections.set(new Map());
    $styleSources.set(new Map());
    $styles.set(new Map());
    $instances.set(new Map());
    $props.set(new Map());
    $dataSources.set(new Map());
  });

  test("insert assets with same ids if missing", () => {
    const data = getWebstudioDataStub();
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        assets: [createImageAsset("asset1", "name", "another_project")],
      },
      availableVariables: [],
    });
    expect(Array.from(data.assets.values())).toEqual([
      createImageAsset("asset1", "name", "current_project"),
    ]);

    data.assets = toMap([
      createImageAsset("asset1", "changed_name", "current_project"),
    ]);
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        assets: [
          createImageAsset("asset1", "name", "another_project"),
          createImageAsset("asset2", "another_name", "another_project"),
        ],
      },
      availableVariables: [],
    });
    expect(Array.from(data.assets.values())).toEqual([
      // preserve any user changes
      createImageAsset("asset1", "changed_name", "current_project"),
      // add new assets while preserving old ones
      createImageAsset("asset2", "another_name", "current_project"),
    ]);
  });

  test("merge breakpoints with existing ones", () => {
    const breakpoints = toMap<Breakpoint>([
      { id: "existing_base", label: "base" },
      { id: "existing_small", label: "small", minWidth: 768 },
    ]);
    const data = getWebstudioDataStub({ breakpoints });
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        breakpoints: [
          { id: "new_base", label: "Base" },
          {
            id: "new_small",
            label: "Small",
            minWidth: 768,
          },
          {
            id: "new_large",
            label: "Large",
            minWidth: 1200,
          },
        ],
      },
      availableVariables: [],
    });
    expect(Array.from(data.breakpoints.values())).toEqual([
      { id: "existing_base", label: "base" },
      { id: "existing_small", label: "small", minWidth: 768 },
      { id: "new_large", label: "Large", minWidth: 1200 },
    ]);
  });

  test("insert missing tokens and use merged breakpoint ids", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources = toMap<StyleSource>([
      { id: "token1", type: "token", name: "oldLabel" },
    ]);
    const data = getWebstudioDataStub({ breakpoints, styleSources });
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        breakpoints: [{ id: "new_base", label: "Base" }],
        styleSources: [
          { id: "token1", type: "token", name: "newLabel" },
          { id: "token2", type: "token", name: "myToken" },
        ],
        styles: [
          {
            styleSourceId: "token1",
            breakpointId: "new_base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
          {
            styleSourceId: "token2",
            breakpointId: "new_base",
            property: "color",
            value: { type: "keyword", value: "green" },
          },
        ],
      },
      availableVariables: [],
    });
    expect(Array.from(data.styleSources.values())).toEqual([
      { id: "token1", type: "token", name: "oldLabel" },
      { id: "token2", type: "token", name: "myToken" },
    ]);
    expect(Array.from(data.styles.values())).toEqual([
      {
        styleSourceId: "token2",
        breakpointId: "base",
        property: "color",
        value: { type: "keyword", value: "green" },
      },
    ]);
  });

  test("insert local styles with new ids and use merged breakpoint ids", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const data = getWebstudioDataStub({ breakpoints });
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        instances: [
          {
            type: "instance",
            id: "box",
            component: "Box",
            children: [],
          },
        ],
        breakpoints: [{ id: "new_base", label: "Base" }],
        styleSourceSelections: [
          { instanceId: "box", values: ["localId", "tokenId"] },
          { instanceId: "unknown", values: [] },
        ],
        styleSources: [{ id: "localId", type: "local" }],
        styles: [
          {
            styleSourceId: "localId",
            breakpointId: "new_base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
          {
            styleSourceId: "tokenId",
            breakpointId: "new_base",
            property: "color",
            value: { type: "keyword", value: "green" },
          },
        ],
      },
      availableVariables: [],
    });
    expect(Array.from(data.styleSourceSelections.values())).toEqual([
      {
        instanceId: expect.not.stringMatching("box"),
        values: [expect.not.stringMatching("localId"), "tokenId"],
      },
    ]);
    expect(Array.from(data.styleSources.values())).toEqual([
      { id: expect.not.stringMatching("localId"), type: "local" },
    ]);
    expect(Array.from(data.styles.values())).toEqual([
      {
        styleSourceId: expect.not.stringMatching("localId"),
        breakpointId: "base",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
    ]);
  });

  test("insert local styles from portal and use merged breakpoint ids", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const data = getWebstudioDataStub({ breakpoints });
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        // portal
        //   fragment
        instances: [
          {
            type: "instance",
            id: "portal",
            component: portalComponent,
            children: [{ type: "id", value: "fragment" }],
          },
          {
            type: "instance",
            id: "fragment",
            component: "Fragment",
            children: [{ type: "id", value: "box" }],
          },
        ],
        breakpoints: [{ id: "new_base", label: "Base" }],
        styleSourceSelections: [
          { instanceId: "fragment", values: ["localId", "tokenId"] },
          { instanceId: "unknown", values: [] },
        ],
        styleSources: [{ id: "localId", type: "local" }],
        styles: [
          {
            styleSourceId: "localId",
            breakpointId: "new_base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
          {
            styleSourceId: "tokenId",
            breakpointId: "new_base",
            property: "color",
            value: { type: "keyword", value: "green" },
          },
        ],
      },
      availableVariables: [],
    });
    expect(Array.from(data.styleSourceSelections.values())).toEqual([
      { instanceId: "fragment", values: ["localId", "tokenId"] },
    ]);
    expect(Array.from(data.styleSources.values())).toEqual([
      { id: "localId", type: "local" },
    ]);
    expect(Array.from(data.styles.values())).toEqual([
      {
        styleSourceId: "localId",
        breakpointId: "base",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
    ]);
  });
});

describe("find closest insertable", () => {
  const newBoxFragment = createFragment({
    children: [{ type: "id", value: "newBoxId" }],
    instances: [
      { type: "instance", id: "newBoxId", component: "Box", children: [] },
    ],
  });

  beforeEach(() => {
    $pages.set(
      createDefaultPages({
        homePageId: "homePageId",
        rootInstanceId: "",
      })
    );
    $awareness.set({
      pageId: "homePageId",
      instanceSelector: ["collectionId[1]", "collectionId", "bodyId"],
    });
    $registeredComponentMetas.set(defaultMetasMap);
  });

  test("puts in the end if closest instance is container", () => {
    const { instances } = renderData(
      <$.Body ws:id="bodyId">
        <$.Box ws:id="boxId">
          <$.Paragraph ws:id="paragraphId">
            <$.Bold ws:id="boldId"></$.Bold>
          </$.Paragraph>
        </$.Box>
      </$.Body>
    );
    $instances.set(instances);
    selectInstance(["boxId", "bodyId"]);
    expect(findClosestInsertable(newBoxFragment)).toEqual({
      parentSelector: ["boxId", "bodyId"],
      position: "end",
    });
  });

  test("puts in the end of root instance", () => {
    const { instances } = renderData(
      <$.Body ws:id="bodyId">
        <$.Paragraph ws:id="paragraphId"></$.Paragraph>
      </$.Body>
    );
    $instances.set(instances);
    selectInstance(["bodyId"]);
    expect(findClosestInsertable(newBoxFragment)).toEqual({
      parentSelector: ["bodyId"],
      position: "end",
    });
  });

  test("puts in the end of root instance when page root only has text", () => {
    const { instances } = renderData(<$.Body ws:id="bodyId">text</$.Body>);
    $instances.set(instances);
    selectInstance(["bodyId"]);
    expect(findClosestInsertable(newBoxFragment)).toEqual({
      parentSelector: ["bodyId"],
      position: "end",
    });
  });

  test("finds closest container and puts after its child within selection", () => {
    const { instances } = renderData(
      <$.Body ws:id="bodyId">
        <$.Paragraph ws:id="paragraphId">
          <$.Bold ws:id="boldId"></$.Bold>
        </$.Paragraph>
      </$.Body>
    );
    $instances.set(instances);
    selectInstance(["boldId", "paragraphId", "bodyId"]);
    expect(findClosestInsertable(newBoxFragment)).toEqual({
      parentSelector: ["bodyId"],
      position: 1,
    });
  });

  test("finds closest container that doesn't have an expression as a child", () => {
    const { instances } = renderData(
      <$.Body ws:id="bodyId">
        <$.Box ws:id="box1Id"></$.Box>
        <$.Paragraph ws:id="paragraphId">{expression`"bla"`}</$.Paragraph>
        <$.Box ws:id="box2Id"></$.Box>
      </$.Body>
    );
    $instances.set(instances);
    selectInstance(["paragraphId", "bodyId"]);
    expect(findClosestInsertable(newBoxFragment)).toEqual({
      parentSelector: ["bodyId"],
      position: 2,
    });
  });

  test("finds closest container without textual placeholder", () => {
    const { instances } = renderData(
      <$.Body ws:id="bodyId">
        <$.Paragraph ws:id="paragraphId"></$.Paragraph>
      </$.Body>
    );
    $instances.set(instances);
    selectInstance(["paragraphId", "bodyId"]);
    expect(findClosestInsertable(newBoxFragment)).toEqual({
      parentSelector: ["bodyId"],
      position: 1,
    });
  });

  test("finds closest container even with when parent has placeholder", () => {
    const { instances } = renderData(
      <$.Body ws:id="bodyId">
        <$.Paragraph ws:id="paragraphId">
          <$.Box ws:id="spanId" tag="span"></$.Box>
        </$.Paragraph>
      </$.Body>
    );
    $instances.set(instances);
    selectInstance(["boxId", "paragraphId", "bodyId"]);
    expect(findClosestInsertable(newBoxFragment)).toEqual({
      parentSelector: ["paragraphId", "bodyId"],
      position: 0,
    });
  });

  test("forbids inserting into :root", () => {
    const { instances } = renderData(<$.Body ws:id="bodyId"></$.Body>);
    $instances.set(instances);
    selectInstance([":root"]);
    expect(findClosestInsertable(newBoxFragment)).toEqual(undefined);
  });

  test("allow inserting into collection item", () => {
    const { instances } = renderData(
      <$.Body ws:id="bodyId">
        <ws.collection ws:id="collectionId">
          <$.Box ws:id="boxId"></$.Box>
        </ws.collection>
      </$.Body>
    );
    $instances.set(instances);
    selectInstance(["collectionId[1]", "collectionId", "bodyId"]);
    expect(findClosestInsertable(newBoxFragment)).toEqual({
      parentSelector: ["collectionId", "bodyId"],
      position: "end",
    });
  });

  test("forbid inserting list item in body", () => {
    const { instances } = renderData(<$.Body ws:id="bodyId"></$.Body>);
    $instances.set(instances);
    selectInstance(["bodyId"]);
    const newListItemFragment = createFragment({
      children: [{ type: "id", value: "newListItemId" }],
      instances: [
        {
          type: "instance",
          id: "newListItemId",
          component: "ListItem",
          children: [],
        },
      ],
    });
    expect(findClosestInsertable(newListItemFragment)).toEqual(undefined);
  });
});
