import { enableMapSet } from "immer";
import { describe, test, expect, beforeEach } from "vitest";
import type { Project } from "@webstudio-is/project";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  $,
  ws,
  css,
  expression,
  renderTemplate,
  renderData,
  ResourceValue,
  token,
} from "@webstudio-is/template";
import * as defaultMetas from "@webstudio-is/sdk-components-react/metas";
import * as radixMetas from "@webstudio-is/sdk-components-react-radix/metas";
import type {
  Asset,
  Breakpoint,
  Instance,
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
  elementComponent,
  ROOT_INSTANCE_ID,
} from "@webstudio-is/sdk";
import { showAttribute } from "@webstudio-is/react-sdk";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-engine";
import {
  deleteInstanceMutable,
  extractWebstudioFragment,
  insertWebstudioFragmentCopy,
  reparentInstanceMutable,
  getWebstudioData,
  insertInstanceChildrenMutable,
  findClosestInsertable,
  insertWebstudioFragmentAt,
  insertWebstudioElementAt,
  buildInstancePath,
  wrapInstance,
  toggleInstanceShow,
  unwrapInstanceMutable,
  canUnwrapInstance,
  canConvertInstance,
  convertInstance,
  deleteSelectedInstance,
  detectPageTokenConflicts,
} from "./instance-utils";
import type { InstancePath } from "./awareness";
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
import { registerContainers } from "./sync/sync-stores";
import {
  $awareness,
  getInstancePath,
  selectInstance,
  selectPage,
} from "./awareness";

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
    Item: { ...base, ...itemMeta },
    AnotherItem: { ...base, ...anotherItemMeta },
    Bold: base,
    Text: base,
    Form: base,
    Box: base,
    Div: base,
    Body: base,
  } as const;
  return new Map(Object.entries(configs)) as Map<string, WsComponentMeta>;
};

const getIdValuePair = <T extends { id: string }>(item: T) =>
  [item.id, item] as const;

const toMap = <T extends { id: string }>(list: T[]) =>
  new Map(list.map(getIdValuePair));

const setDataStores = (data: Omit<WebstudioData, "pages">) => {
  $instances.set(data.instances);
  $breakpoints.set(data.breakpoints);
  $styleSources.set(data.styleSources);
  $styles.set(data.styles);
  $styleSourceSelections.set(data.styleSourceSelections);
  $dataSources.set(data.dataSources);
  $props.set(data.props);
  $assets.set(data.assets);
  $resources.set(data.resources);
};

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

describe("insert instance children", () => {
  test("insert instance children into empty target", () => {
    const data = renderData(
      <ws.element ws:tag="body" ws:id="bodyId"></ws.element>
    );
    const [div] = renderTemplate(
      <ws.element ws:tag="div" ws:id="divId"></ws.element>
    ).instances;
    data.instances.set(div.id, div);
    insertInstanceChildrenMutable(data, [{ type: "id", value: "divId" }], {
      parentSelector: ["bodyId"],
      position: "end",
    });
    expect(data).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="div" ws:id="divId"></ws.element>
        </ws.element>
      )
    );
  });

  test("insert instance children into the end of target", () => {
    const data = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <ws.element ws:tag="div" ws:id="textId"></ws.element>
      </ws.element>
    );
    const [div] = renderTemplate(
      <ws.element ws:tag="div" ws:id="divId"></ws.element>
    ).instances;
    data.instances.set(div.id, div);
    insertInstanceChildrenMutable(data, [{ type: "id", value: "divId" }], {
      parentSelector: ["bodyId"],
      position: "end",
    });
    expect(data).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="div" ws:id="textId"></ws.element>
          <ws.element ws:tag="div" ws:id="divId"></ws.element>
        </ws.element>
      )
    );
  });

  test("insert instance children into the start of target", () => {
    const data = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <ws.element ws:tag="div" ws:id="textId"></ws.element>
      </ws.element>
    );
    const [div] = renderTemplate(
      <ws.element ws:tag="div" ws:id="divId"></ws.element>
    ).instances;
    data.instances.set(div.id, div);
    insertInstanceChildrenMutable(data, [{ type: "id", value: "divId" }], {
      parentSelector: ["bodyId"],
      position: 0,
    });
    expect(data).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="div" ws:id="divId"></ws.element>
          <ws.element ws:tag="div" ws:id="textId"></ws.element>
        </ws.element>
      )
    );
  });

  test("insert instance children at the start of text", () => {
    const data = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <ws.element ws:tag="div" ws:id="textId">
          text
        </ws.element>
      </ws.element>
    );
    const [div] = renderTemplate(
      <ws.element ws:tag="div" ws:id="divId"></ws.element>
    ).instances;
    data.instances.set(div.id, div);
    insertInstanceChildrenMutable(data, [{ type: "id", value: "divId" }], {
      parentSelector: ["textId", "bodyId"],
      position: 0,
    });
    const [_bodyId, _textId, _divId, spanId] = data.instances.keys();
    expect(data).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="div" ws:id="textId">
            <ws.element ws:tag="div" ws:id="divId"></ws.element>
            <ws.element ws:tag="span" ws:id={spanId}>
              text
            </ws.element>
          </ws.element>
        </ws.element>
      )
    );
  });

  test("insert instance children at the end of text", () => {
    const data = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <ws.element ws:tag="div" ws:id="textId">
          text
        </ws.element>
      </ws.element>
    );
    const [div] = renderTemplate(
      <ws.element ws:tag="div" ws:id="divId"></ws.element>
    ).instances;
    data.instances.set(div.id, div);
    insertInstanceChildrenMutable(data, [{ type: "id", value: "divId" }], {
      parentSelector: ["textId", "bodyId"],
      position: "end",
    });
    const [_bodyId, _textId, _divId, spanId] = data.instances.keys();
    expect(data).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="div" ws:id="textId">
            <ws.element ws:tag="span" ws:id={spanId}>
              text
            </ws.element>
            <ws.element ws:tag="div" ws:id="divId"></ws.element>
          </ws.element>
        </ws.element>
      )
    );
  });

  test("insert instance children between text children", () => {
    const data = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <ws.element ws:tag="div" ws:id="textId">
          <ws.element ws:tag="strong" ws:id="strongId">
            strong
          </ws.element>
          text
          <ws.element ws:tag="em" ws:id="emId">
            emphasis
          </ws.element>
        </ws.element>
      </ws.element>
    );
    const [div] = renderTemplate(
      <ws.element ws:tag="div" ws:id="divId"></ws.element>
    ).instances;
    data.instances.set(div.id, div);
    insertInstanceChildrenMutable(data, [{ type: "id", value: "divId" }], {
      parentSelector: ["textId", "bodyId"],
      position: 1,
    });
    const [
      _bodyId,
      _textId,
      _strongId,
      _emId,
      _divId,
      leftSpanId,
      rightSpanId,
    ] = data.instances.keys();
    expect(data).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="div" ws:id="textId">
            <ws.element ws:tag="span" ws:id={leftSpanId}>
              <ws.element ws:tag="strong" ws:id="strongId">
                strong
              </ws.element>
            </ws.element>
            <ws.element ws:tag="div" ws:id="divId"></ws.element>
            <ws.element ws:tag="span" ws:id={rightSpanId}>
              text
              <ws.element ws:tag="em" ws:id="emId">
                emphasis
              </ws.element>
            </ws.element>
          </ws.element>
        </ws.element>
      )
    );
  });
});

describe("insert webstudio element at", () => {
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

  test("insert element with div tag into body", () => {
    $instances.set(renderData(<$.Body ws:id="bodyId"></$.Body>).instances);
    insertWebstudioElementAt({
      parentSelector: ["bodyId"],
      position: "end",
    });
    const [_bodyId, newInstanceId] = $instances.get().keys();
    expect($instances.get()).toEqual(
      renderData(
        <$.Body ws:id="bodyId">
          <ws.element ws:id={newInstanceId} ws:tag="div" />
        </$.Body>
      ).instances
    );
  });

  test("insert element with li tag into ul", () => {
    $instances.set(
      renderData(
        <$.Body ws:id="bodyId">
          <ws.element ws:id="listId" ws:tag="ul"></ws.element>
        </$.Body>
      ).instances
    );
    insertWebstudioElementAt({
      parentSelector: ["listId", "bodyId"],
      position: "end",
    });
    const [_bodyId, _listId, newInstanceId] = $instances.get().keys();
    expect($instances.get()).toEqual(
      renderData(
        <$.Body ws:id="bodyId">
          <ws.element ws:id="listId" ws:tag="ul">
            <ws.element ws:id={newInstanceId} ws:tag="li" />
          </ws.element>
        </$.Body>
      ).instances
    );
  });

  test("insert element into selected instance", () => {
    $pages.set(
      createDefaultPages({ homePageId: "homePageId", rootInstanceId: "bodyId" })
    );
    $instances.set(
      renderData(
        <$.Body ws:id="bodyId">
          <ws.element ws:id="divId" ws:tag="div"></ws.element>
        </$.Body>
      ).instances
    );
    selectPage("homePageId");
    selectInstance(["divId", "bodyId"]);
    insertWebstudioElementAt();
    const [_bodyId, _divId, newInstanceId] = $instances.get().keys();
    expect($instances.get()).toEqual(
      renderData(
        <$.Body ws:id="bodyId">
          <ws.element ws:id="divId" ws:tag="div">
            <ws.element ws:id={newInstanceId} ws:tag="div" />
          </ws.element>
        </$.Body>
      ).instances
    );
  });

  test("insert element into closest non-textual container", () => {
    $pages.set(
      createDefaultPages({ homePageId: "homePageId", rootInstanceId: "bodyId" })
    );
    $instances.set(
      renderData(
        <$.Body ws:id="bodyId">
          <ws.element ws:id="divId" ws:tag="div">
            text
          </ws.element>
          <ws.element ws:id="spanId" ws:tag="span"></ws.element>
        </$.Body>
      ).instances
    );
    selectPage("homePageId");
    selectInstance(["divId", "bodyId"]);
    insertWebstudioElementAt();
    const [_bodyId, _divId, _spanId, newInstanceId] = $instances.get().keys();
    expect($instances.get()).toEqual(
      renderData(
        <$.Body ws:id="bodyId">
          <ws.element ws:id="divId" ws:tag="div">
            text
          </ws.element>
          <ws.element ws:id={newInstanceId} ws:tag="div" />
          <ws.element ws:id="spanId" ws:tag="span"></ws.element>
        </$.Body>
      ).instances
    );
  });

  test("insert element into closest non-empty container", () => {
    $pages.set(
      createDefaultPages({ homePageId: "homePageId", rootInstanceId: "bodyId" })
    );
    $instances.set(
      renderData(
        <$.Body ws:id="bodyId">
          <ws.element ws:id="imgId" ws:tag="img"></ws.element>
          <ws.element ws:id="spanId" ws:tag="span"></ws.element>
        </$.Body>
      ).instances
    );
    selectPage("homePageId");
    selectInstance(["imgId", "bodyId"]);
    insertWebstudioElementAt();
    const [_bodyId, _imgId, _spanId, newInstanceId] = $instances.get().keys();
    expect($instances.get()).toEqual(
      renderData(
        <$.Body ws:id="bodyId">
          <ws.element ws:id="imgId" ws:tag="img"></ws.element>
          <ws.element ws:id={newInstanceId} ws:tag="div" />
          <ws.element ws:id="spanId" ws:tag="span"></ws.element>
        </$.Body>
      ).instances
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
    const data = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="box">
          <$.Text ws:id="text"></$.Text>
        </$.Box>
        <$.Button ws:id="button"></$.Button>
      </$.Body>
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentInstanceMutable(data, ["text", "box", "body"], {
      parentSelector: ["body"],
      position: 1,
    });
    const newTextId = data.instances.get("body")?.children[1].value as string;
    expect(data.instances).toEqual(
      renderData(
        <$.Body ws:id="body">
          <$.Box ws:id="box"></$.Box>
          <$.Text ws:id={newTextId}></$.Text>
          <$.Button ws:id="button"></$.Button>
        </$.Body>
      ).instances
    );
  });

  test("to the end", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="box">
          <$.Text ws:id="text"></$.Text>
        </$.Box>
      </$.Body>
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentInstanceMutable(data, ["text", "box", "body"], {
      parentSelector: ["body"],
      position: "end",
    });
    const newTextId = data.instances.get("body")?.children[1].value as string;
    expect(data.instances).toEqual(
      renderData(
        <$.Body ws:id="body">
          <$.Box ws:id="box"></$.Box>
          <$.Text ws:id={newTextId}></$.Text>
        </$.Body>
      ).instances
    );
  });

  test("before itself", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Text ws:id="text"></$.Text>
        <$.Box ws:id="box"></$.Box>
        <$.Button ws:id="button"></$.Button>
      </$.Body>
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentInstanceMutable(data, ["box", "body"], {
      parentSelector: ["body"],
      position: 1,
    });
    expect(data.instances).toEqual(
      renderData(
        <$.Body ws:id="body">
          <$.Text ws:id="text"></$.Text>
          <$.Box ws:id="box"></$.Box>
          <$.Button ws:id="button"></$.Button>
        </$.Body>
      ).instances
    );
  });

  test("after itself", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Text ws:id="text"></$.Text>
        <$.Box ws:id="box"></$.Box>
        <$.Button ws:id="button"></$.Button>
      </$.Body>
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentInstanceMutable(data, ["box", "body"], {
      parentSelector: ["body"],
      position: 2,
    });
    expect(data.instances).toEqual(
      renderData(
        <$.Body ws:id="body">
          <$.Text ws:id="text"></$.Text>
          <$.Box ws:id="box"></$.Box>
          <$.Button ws:id="button"></$.Button>
        </$.Body>
      ).instances
    );
  });

  test("wrap with fragment when reparent into empty slot", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot"></$.Slot>
        <$.Box ws:id="box"></$.Box>
      </$.Body>
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentInstanceMutable(data, ["box", "body"], {
      parentSelector: ["slot", "body"],
      position: "end",
    });
    const newFragmentId = data.instances.get("slot")?.children[0]
      .value as string;
    const newBoxId = data.instances.get(newFragmentId)?.children[0]
      .value as string;
    expect(data.instances).toEqual(
      renderData(
        <$.Body ws:id="body">
          <$.Slot ws:id="slot">
            <$.Fragment ws:id={newFragmentId}>
              <$.Box ws:id={newBoxId}></$.Box>
            </$.Fragment>
          </$.Slot>
        </$.Body>
      ).instances
    );
  });

  test("reuse existing fragment when reparent into slot", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot">
          <$.Fragment ws:id="fragment"></$.Fragment>
        </$.Slot>
        <$.Box ws:id="box"></$.Box>
      </$.Body>
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentInstanceMutable(data, ["box", "body"], {
      parentSelector: ["slot", "body"],
      position: "end",
    });
    const newBoxId = data.instances.get("fragment")?.children[0]
      .value as string;
    expect(data.instances).toEqual(
      renderData(
        <$.Body ws:id="body">
          <$.Slot ws:id="slot">
            <$.Fragment ws:id="fragment">
              <$.Box ws:id={newBoxId}></$.Box>
            </$.Fragment>
          </$.Slot>
        </$.Body>
      ).instances
    );
  });

  test("reparent slot child from one instance of this slot into another", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Fragment ws:id="fragment">
            <$.Box ws:id="box"></$.Box>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Fragment ws:id="fragment">
            <$.Box ws:id="box"></$.Box>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentInstanceMutable(data, ["box", "fragment", "slot1", "body"], {
      parentSelector: ["slot2", "body"],
      position: "end",
    });
    expect(data.instances).toEqual(
      renderData(
        <$.Body ws:id="body">
          <$.Slot ws:id="slot1">
            <$.Fragment ws:id="fragment">
              <$.Box ws:id="box"></$.Box>
            </$.Fragment>
          </$.Slot>
          <$.Slot ws:id="slot2">
            {/* same ids */}
            <$.Fragment ws:id="fragment">
              <$.Box ws:id="box"></$.Box>
            </$.Fragment>
          </$.Slot>
        </$.Body>
      ).instances
    );
  });

  test("prevent slot reparenting into own children to avoid infinite loop", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot">
          <$.Fragment ws:id="fragment"></$.Fragment>
        </$.Slot>
      </$.Body>
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentInstanceMutable(data, ["slot", "body"], {
      parentSelector: ["fragment", "slot", "body"],
      position: "end",
    });
    expect(data.instances).toEqual(
      renderData(
        <$.Body ws:id="body">
          <$.Slot ws:id="slot">
            <$.Fragment ws:id="fragment"></$.Fragment>
          </$.Slot>
        </$.Body>
      ).instances
    );
  });

  test("from collection item", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <ws.collection ws:id="collection">
          <$.Box ws:id="box"></$.Box>
        </ws.collection>
      </$.Body>
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentInstanceMutable(
      data,
      ["box", "collection[0]", "collection", "body"],
      { parentSelector: ["body"], position: "end" }
    );
    const newBoxId = data.instances.get("body")?.children[1].value as string;
    expect(data.instances).toEqual(
      renderData(
        <$.Body ws:id="body">
          <ws.collection ws:id="collection"></ws.collection>
          <$.Box ws:id={newBoxId}></$.Box>
        </$.Body>
      ).instances
    );
  });

  test("move required child within same instance", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Tooltip ws:id="tooltip">
          <$.TooltipTrigger ws:id="trigger"></$.TooltipTrigger>
          <$.TooltipContent ws:id="content"></$.TooltipContent>
        </$.Tooltip>
      </$.Body>
    );
    $registeredComponentMetas.set(
      new Map(Object.entries({ ...defaultMetas, ...radixMetas }))
    );
    reparentInstanceMutable(data, ["trigger", "tooltip", "body"], {
      parentSelector: ["tooltip", "body"],
      position: "end",
    });
    expect(data.instances).toEqual(
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
      searchParams: [],
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
      searchParams: [],
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

describe("wrap in", () => {
  test("wrap instance in link", () => {
    $instances.set(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="div" ws:id="divId"></ws.element>
        </ws.element>
      ).instances
    );
    selectInstance(["divId", "bodyId"]);
    wrapInstance(elementComponent, "a");
    expect($instances.get()).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="a" ws:id={expect.any(String)}>
            <ws.element ws:tag="div" ws:id="divId"></ws.element>
          </ws.element>
        </ws.element>
      ).instances
    );
  });

  test("wrap image in element", () => {
    $instances.set(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="img" ws:id="imageId"></ws.element>
        </ws.element>
      ).instances
    );
    selectInstance(["imageId", "bodyId"]);
    wrapInstance(elementComponent);
    expect($instances.get()).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="div" ws:id={expect.any(String)}>
            <ws.element ws:tag="img" ws:id="imageId"></ws.element>
          </ws.element>
        </ws.element>
      ).instances
    );
  });

  test("avoid wrapping text with link in link", () => {
    const { instances } = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <ws.element ws:tag="p" ws:id="textId">
          <ws.element ws:tag="a" ws:id="linkId"></ws.element>
        </ws.element>
      </ws.element>
    );
    $instances.set(instances);
    selectInstance(["textId", "bodyId"]);
    wrapInstance(elementComponent, "a");
    // nothing is changed
    expect($instances.get()).toEqual(instances);
  });

  test("avoid wrapping textual content", () => {
    const { instances } = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <ws.element ws:tag="div" ws:id="textId">
          <ws.element ws:tag="bold" ws:id="boldId"></ws.element>
        </ws.element>
      </ws.element>
    );
    $instances.set(instances);
    selectInstance(["boldId", "textId", "bodyId"]);
    wrapInstance(elementComponent);
    // nothing is changed
    expect($instances.get()).toEqual(instances);
  });

  test("avoid wrapping list item", () => {
    const { instances } = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <ws.element ws:tag="ul" ws:id="listId">
          <ws.element ws:tag="li" ws:id="listItemId"></ws.element>
        </ws.element>
      </ws.element>
    );
    $instances.set(instances);
    selectInstance(["listItemId", "listId", "bodyId"]);
    wrapInstance(elementComponent);
    // nothing is changed
    expect($instances.get()).toEqual(instances);
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
      projectId: "current_project",
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
      projectId: "current_project",
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
      projectId: "",
    });
    expect(Array.from(data.breakpoints.values())).toEqual([
      { id: "existing_base", label: "base" },
      { id: "existing_small", label: "small", minWidth: 768 },
      { id: "new_large", label: "Large", minWidth: 1200 },
    ]);
  });

  // Case 2: Same styles AND same name -> reuse existing token
  test("token with same styles and same name reuses existing token", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources = toMap<StyleSource>([
      { id: "existingToken", type: "token", name: "primaryColor" },
    ]);
    const styles = new Map([
      createStyleDeclPair("existingToken", "base", "color", {
        type: "keyword",
        value: "red",
      }),
      createStyleDeclPair("existingToken", "base", "fontSize", {
        type: "unit",
        value: 16,
        unit: "px",
      }),
    ]);
    const data = getWebstudioDataStub({ breakpoints, styleSources, styles });

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        breakpoints: [{ id: "base", label: "base" }],
        styleSources: [
          // Same name "primaryColor", same styles, different id
          { id: "newToken", type: "token", name: "primaryColor" },
        ],
        styles: [
          {
            styleSourceId: "newToken",
            breakpointId: "base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
          {
            styleSourceId: "newToken",
            breakpointId: "base",
            property: "fontSize",
            value: { type: "unit", value: 16, unit: "px" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    // Should reuse existing token, not create a new one
    expect(Array.from(data.styleSources.values())).toEqual([
      { id: "existingToken", type: "token", name: "primaryColor" },
    ]);
    // No new styles should be added
    expect(Array.from(data.styles.values())).toEqual([
      {
        styleSourceId: "existingToken",
        breakpointId: "base",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
      {
        styleSourceId: "existingToken",
        breakpointId: "base",
        property: "fontSize",
        value: { type: "unit", value: 16, unit: "px" },
      },
    ]);
  });

  // Case 3: Same styles but different name -> insert new token with original name
  test("token with same styles but different name inserts new token", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources = toMap<StyleSource>([
      { id: "token1", type: "token", name: "primaryColor" },
    ]);
    const styles = new Map([
      createStyleDeclPair("token1", "base", "color", {
        type: "keyword",
        value: "red",
      }),
    ]);
    const data = getWebstudioDataStub({ breakpoints, styleSources, styles });

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        breakpoints: [{ id: "base", label: "base" }],
        styleSources: [
          // Different name "accentColor", same styles
          { id: "token2", type: "token", name: "accentColor" },
        ],
        styles: [
          {
            styleSourceId: "token2",
            breakpointId: "base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    // Should insert new token with its original name
    const tokens = Array.from(data.styleSources.values());
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toEqual({
      id: "token1",
      type: "token",
      name: "primaryColor",
    });
    expect(tokens[1]).toMatchObject({ type: "token", name: "accentColor" });
    expect(tokens[1].id).not.toBe("token2"); // Should have new ID

    const tokenStyles = Array.from(data.styles.values());
    expect(tokenStyles).toHaveLength(2);
    expect(tokenStyles[0]).toEqual({
      styleSourceId: "token1",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    });
    expect(tokenStyles[1]).toMatchObject({
      styleSourceId: tokens[1].id, // Should reference new token ID
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    });
  });

  // Case 4: Different styles but same name -> add counter suffix
  test("token with different styles but same name adds counter suffix", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources = toMap<StyleSource>([
      { id: "token1", type: "token", name: "myToken" },
    ]);
    const styles = new Map([
      createStyleDeclPair("token1", "base", "color", {
        type: "keyword",
        value: "blue",
      }),
    ]);
    const data = getWebstudioDataStub({ breakpoints, styleSources, styles });

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        breakpoints: [{ id: "base", label: "base" }],
        styleSources: [
          // Same name "myToken", different styles
          { id: "token2", type: "token", name: "myToken" },
        ],
        styles: [
          {
            styleSourceId: "token2",
            breakpointId: "base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    // Should add counter suffix to the new token
    const tokens = Array.from(data.styleSources.values());
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toEqual({ id: "token1", type: "token", name: "myToken" });
    expect(tokens[1]).toMatchObject({ type: "token", name: "myToken-1" });
    expect(tokens[1].id).not.toBe("token2"); // Should have new ID

    const tokenStyles = Array.from(data.styles.values());
    expect(tokenStyles).toHaveLength(2);
    expect(tokenStyles[0]).toEqual({
      styleSourceId: "token1",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "blue" },
    });
    expect(tokenStyles[1]).toMatchObject({
      styleSourceId: tokens[1].id,
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    });
  });

  // Case 4b: Multiple counter suffixes
  test("token with name conflict increments counter correctly", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources = toMap<StyleSource>([
      { id: "token1", type: "token", name: "myToken" },
      { id: "token2", type: "token", name: "myToken-1" },
      { id: "token3", type: "token", name: "myToken-2" },
    ]);
    const styles = new Map([
      createStyleDeclPair("token1", "base", "color", {
        type: "keyword",
        value: "blue",
      }),
      createStyleDeclPair("token2", "base", "color", {
        type: "keyword",
        value: "green",
      }),
      createStyleDeclPair("token3", "base", "color", {
        type: "keyword",
        value: "yellow",
      }),
    ]);
    const data = getWebstudioDataStub({ breakpoints, styleSources, styles });

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        breakpoints: [{ id: "base", label: "base" }],
        styleSources: [{ id: "token4", type: "token", name: "myToken" }],
        styles: [
          {
            styleSourceId: "token4",
            breakpointId: "base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    // Should use counter 3
    const tokens = Array.from(data.styleSources.values());
    expect(tokens).toHaveLength(4);
    expect(tokens[0]).toEqual({ id: "token1", type: "token", name: "myToken" });
    expect(tokens[1]).toEqual({
      id: "token2",
      type: "token",
      name: "myToken-1",
    });
    expect(tokens[2]).toEqual({
      id: "token3",
      type: "token",
      name: "myToken-2",
    });
    expect(tokens[3]).toMatchObject({ type: "token", name: "myToken-3" });
    expect(tokens[3].id).not.toBe("token4"); // Should have new ID
  });

  // Case 6: Different styles and different name -> insert as-is
  test("token with different styles and different name inserts normally", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources = toMap<StyleSource>([
      { id: "token1", type: "token", name: "primaryColor" },
    ]);
    const styles = new Map([
      createStyleDeclPair("token1", "base", "color", {
        type: "keyword",
        value: "blue",
      }),
    ]);
    const data = getWebstudioDataStub({ breakpoints, styleSources, styles });

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        breakpoints: [{ id: "base", label: "base" }],
        styleSources: [{ id: "token2", type: "token", name: "secondaryColor" }],
        styles: [
          {
            styleSourceId: "token2",
            breakpointId: "base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    // Should insert new token normally
    const tokens = Array.from(data.styleSources.values());
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toEqual({
      id: "token1",
      type: "token",
      name: "primaryColor",
    });
    expect(tokens[1]).toMatchObject({ type: "token", name: "secondaryColor" });
    expect(tokens[1].id).not.toBe("token2"); // Should have new ID

    const tokenStyles = Array.from(data.styles.values());
    expect(tokenStyles).toHaveLength(2);
    expect(tokenStyles[0]).toEqual({
      styleSourceId: "token1",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "blue" },
    });
    expect(tokenStyles[1]).toMatchObject({
      styleSourceId: tokens[1].id,
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    });
  });

  // Test that instance with matching token gets the token reference updated
  test("instance with reused token updates styleSourceSelection to existing token id", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources = toMap<StyleSource>([
      { id: "existingToken", type: "token", name: "primaryColor" },
    ]);
    const styles = new Map([
      createStyleDeclPair("existingToken", "base", "color", {
        type: "keyword",
        value: "red",
      }),
    ]);
    const data = getWebstudioDataStub({ breakpoints, styleSources, styles });

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
        breakpoints: [{ id: "base", label: "base" }],
        styleSources: [
          // Same name and same styles as existingToken
          { id: "newToken", type: "token", name: "primaryColor" },
        ],
        styleSourceSelections: [{ instanceId: "box", values: ["newToken"] }],
        styles: [
          {
            styleSourceId: "newToken",
            breakpointId: "base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    // Should reuse existing token
    expect(Array.from(data.styleSources.values())).toEqual([
      { id: "existingToken", type: "token", name: "primaryColor" },
    ]);

    // The instance should reference the existing token, not the new one
    const newBoxId = Array.from(data.instances.keys())[0];
    expect(data.styleSourceSelections.get(newBoxId)).toEqual({
      instanceId: newBoxId,
      values: ["existingToken"], // Should use existing token id, not "newToken"
    });
  });

  // Case 3 safeguard: Same styles but different name gets suffix when name conflicts
  test("token with same styles but different name adds suffix when name already exists", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources = toMap<StyleSource>([
      { id: "token1", type: "token", name: "primaryColor" },
      { id: "token2", type: "token", name: "accentColor" }, // This name is taken
    ]);
    const styles = new Map([
      createStyleDeclPair("token1", "base", "color", {
        type: "keyword",
        value: "red",
      }),
      createStyleDeclPair("token2", "base", "fontSize", {
        type: "unit",
        value: 16,
        unit: "px",
      }),
    ]);
    const data = getWebstudioDataStub({ breakpoints, styleSources, styles });

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        breakpoints: [{ id: "base", label: "base" }],
        styleSources: [
          // Same styles as token1, but wants to use name "accentColor" which is already taken
          { id: "token3", type: "token", name: "accentColor" },
        ],
        styles: [
          {
            styleSourceId: "token3",
            breakpointId: "base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    // Should add counter suffix to prevent duplicate name
    const tokens = Array.from(data.styleSources.values());
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toEqual({
      id: "token1",
      type: "token",
      name: "primaryColor",
    });
    expect(tokens[1]).toEqual({
      id: "token2",
      type: "token",
      name: "accentColor",
    });
    expect(tokens[2]).toMatchObject({ type: "token", name: "accentColor-1" });
    expect(tokens[2].id).not.toBe("token3"); // Should have new ID

    const tokenStyles = Array.from(data.styles.values());
    expect(tokenStyles).toHaveLength(3);
    expect(tokenStyles[0]).toEqual({
      styleSourceId: "token1",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    });
    expect(tokenStyles[1]).toEqual({
      styleSourceId: "token2",
      breakpointId: "base",
      property: "fontSize",
      value: { type: "unit", value: 16, unit: "px" },
    });
    expect(tokenStyles[2]).toMatchObject({
      styleSourceId: tokens[2].id,
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    });
  });

  // Case 6 safeguard: Different styles and different name gets suffix when name conflicts
  test("token with different styles and name adds suffix when name already exists", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources = toMap<StyleSource>([
      { id: "token1", type: "token", name: "primaryColor" },
      { id: "token2", type: "token", name: "secondaryColor" }, // This name is taken
    ]);
    const styles = new Map([
      createStyleDeclPair("token1", "base", "color", {
        type: "keyword",
        value: "blue",
      }),
      createStyleDeclPair("token2", "base", "color", {
        type: "keyword",
        value: "green",
      }),
    ]);
    const data = getWebstudioDataStub({ breakpoints, styleSources, styles });

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        breakpoints: [{ id: "base", label: "base" }],
        styleSources: [
          // Different styles from both existing tokens, but wants name "secondaryColor"
          { id: "token3", type: "token", name: "secondaryColor" },
        ],
        styles: [
          {
            styleSourceId: "token3",
            breakpointId: "base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    // Should add counter suffix to prevent duplicate name
    const tokens = Array.from(data.styleSources.values());
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toEqual({
      id: "token1",
      type: "token",
      name: "primaryColor",
    });
    expect(tokens[1]).toEqual({
      id: "token2",
      type: "token",
      name: "secondaryColor",
    });
    expect(tokens[2]).toMatchObject({
      type: "token",
      name: "secondaryColor-1",
    });
    expect(tokens[2].id).not.toBe("token3"); // Should have new ID

    const tokenStyles = Array.from(data.styles.values());
    expect(tokenStyles).toHaveLength(3);
    expect(tokenStyles[0]).toEqual({
      styleSourceId: "token1",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "blue" },
    });
    expect(tokenStyles[1]).toEqual({
      styleSourceId: "token2",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "green" },
    });
    expect(tokenStyles[2]).toMatchObject({
      styleSourceId: tokens[2].id,
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    });
  });

  // Test that existing token with same styles but different name stays untouched
  test("existing token with matching styles but different name stays untouched when inserting new token", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources = toMap<StyleSource>([
      { id: "existingToken", type: "token", name: "primaryColor" },
    ]);
    const styles = new Map([
      createStyleDeclPair("existingToken", "base", "color", {
        type: "keyword",
        value: "red",
      }),
      createStyleDeclPair("existingToken", "base", "fontSize", {
        type: "unit",
        value: 16,
        unit: "px",
      }),
    ]);
    const data = getWebstudioDataStub({ breakpoints, styleSources, styles });

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        breakpoints: [{ id: "base", label: "base" }],
        styleSources: [
          // Different name "accentColor", same styles as existingToken
          { id: "newToken", type: "token", name: "accentColor" },
        ],
        styles: [
          {
            styleSourceId: "newToken",
            breakpointId: "base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
          {
            styleSourceId: "newToken",
            breakpointId: "base",
            property: "fontSize",
            value: { type: "unit", value: 16, unit: "px" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    // Should insert new token with its own name, leaving existing one untouched
    const tokens = Array.from(data.styleSources.values());
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toEqual({
      id: "existingToken",
      type: "token",
      name: "primaryColor",
    });
    expect(tokens[1]).toMatchObject({ type: "token", name: "accentColor" });
    expect(tokens[1].id).not.toBe("newToken"); // Should have new ID

    // Both tokens should have their own styles
    const tokenStyles = Array.from(data.styles.values());
    expect(tokenStyles).toHaveLength(4);
    expect(tokenStyles[0]).toEqual({
      styleSourceId: "existingToken",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    });
    expect(tokenStyles[1]).toEqual({
      styleSourceId: "existingToken",
      breakpointId: "base",
      property: "fontSize",
      value: { type: "unit", value: 16, unit: "px" },
    });
    expect(tokenStyles[2]).toMatchObject({
      styleSourceId: tokens[1].id,
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    });
    expect(tokenStyles[3]).toMatchObject({
      styleSourceId: tokens[1].id,
      breakpointId: "base",
      property: "fontSize",
      value: { type: "unit", value: 16, unit: "px" },
    });
  });

  // Critical test: inserting base name when suffixed version exists
  test("inserting token 'bbb' when 'bbb-1' with same styles exists inserts both tokens", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources = toMap<StyleSource>([
      { id: "existingToken", type: "token", name: "bbb-1" },
    ]);
    const styles = new Map([
      createStyleDeclPair("existingToken", "base", "color", {
        type: "keyword",
        value: "blue",
      }),
    ]);
    const data = getWebstudioDataStub({ breakpoints, styleSources, styles });

    // Add an instance that uses the existing token
    const existingInstance = createInstance("existingInstance", "Box", []);
    data.instances.set("existingInstance", existingInstance);
    data.styleSourceSelections.set("existingInstance", {
      instanceId: "existingInstance",
      values: ["existingToken"],
    });

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
        breakpoints: [{ id: "base", label: "base" }],
        styleSources: [
          // Inserting "bbb" with same styles as "bbb-1"
          { id: "newToken", type: "token", name: "bbb" },
        ],
        styleSourceSelections: [{ instanceId: "box", values: ["newToken"] }],
        styles: [
          {
            styleSourceId: "newToken",
            breakpointId: "base",
            property: "color",
            value: { type: "keyword", value: "blue" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    // Both tokens should exist
    const tokens = Array.from(data.styleSources.values());
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toEqual({
      id: "existingToken",
      type: "token",
      name: "bbb-1",
    });
    expect(tokens[1]).toMatchObject({ type: "token", name: "bbb" }); // Different name, so inserted as-is
    expect(tokens[1].id).not.toBe("newToken"); // Should have new ID

    // Both should have their own styles
    const tokenStyles = Array.from(data.styles.values());
    expect(tokenStyles).toHaveLength(2);
    expect(tokenStyles[0]).toEqual({
      styleSourceId: "existingToken",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "blue" },
    });
    expect(tokenStyles[1]).toMatchObject({
      styleSourceId: tokens[1].id,
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "blue" },
    });

    // The EXISTING instance should still reference "bbb-1" (existingToken)
    expect(data.styleSourceSelections.get("existingInstance")).toEqual({
      instanceId: "existingInstance",
      values: ["existingToken"],
    });

    // The new instance should reference the new token "bbb" (tokens[1].id)
    const newBoxId = Array.from(data.instances.keys()).find(
      (id) => id !== "existingInstance"
    );
    expect(data.styleSourceSelections.get(newBoxId!)).toEqual({
      instanceId: newBoxId,
      values: [tokens[1].id],
    });
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
      projectId: "",
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
      projectId: "",
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

  test("merge local styles into existing ROOT_INSTANCE_ID local source", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources = toMap<StyleSource>([
      { id: "existingLocal", type: "local" },
    ]);
    const styleSourceSelections = new Map([
      [
        ROOT_INSTANCE_ID,
        { instanceId: ROOT_INSTANCE_ID, values: ["existingLocal"] },
      ],
    ]);
    const styles = new Map([
      createStyleDeclPair("existingLocal", "base", "fontSize", {
        type: "unit",
        value: 16,
        unit: "px",
      }),
    ]);
    const data = getWebstudioDataStub({
      breakpoints,
      styleSources,
      styleSourceSelections,
      styles,
    });

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        instances: [
          {
            type: "instance",
            id: ROOT_INSTANCE_ID,
            component: "Body",
            children: [],
          },
        ],
        breakpoints: [{ id: "base", label: "base" }],
        styleSourceSelections: [
          { instanceId: ROOT_INSTANCE_ID, values: ["newLocal"] },
        ],
        styleSources: [{ id: "newLocal", type: "local" }],
        styles: [
          {
            styleSourceId: "newLocal",
            breakpointId: "base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    // Should merge into existing local source
    expect(Array.from(data.styleSources.values())).toEqual([
      { id: "existingLocal", type: "local" },
    ]);
    expect(data.styleSourceSelections.get(ROOT_INSTANCE_ID)).toEqual({
      instanceId: ROOT_INSTANCE_ID,
      values: ["existingLocal"],
    });
    // Both styles should be present under the same source
    expect(Array.from(data.styles.values())).toEqual([
      {
        styleSourceId: "existingLocal",
        breakpointId: "base",
        property: "fontSize",
        value: { type: "unit", value: 16, unit: "px" },
      },
      {
        styleSourceId: "existingLocal",
        breakpointId: "base",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
    ]);
  });

  test("insert instances with new ids and update child references", () => {
    const data = getWebstudioDataStub();
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        instances: [
          {
            type: "instance",
            id: "parent",
            component: "Box",
            children: [
              { type: "id", value: "child1" },
              { type: "id", value: "child2" },
            ],
          },
          {
            type: "instance",
            id: "child1",
            component: "Text",
            children: [],
          },
          {
            type: "instance",
            id: "child2",
            component: "Text",
            children: [],
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    const newInstances = Array.from(data.instances.values());
    expect(newInstances).toHaveLength(3);

    const parentInstance = newInstances.find((i) => i.component === "Box");
    const childInstances = newInstances.filter((i) => i.component === "Text");

    expect(parentInstance).toBeDefined();
    expect(childInstances).toHaveLength(2);

    // Verify parent's children reference the new child ids
    expect(parentInstance?.children).toEqual([
      { type: "id", value: childInstances[0].id },
      { type: "id", value: childInstances[1].id },
    ]);

    // Verify new ids were generated (not same as original)
    expect(parentInstance?.id).not.toBe("parent");
    expect(childInstances[0].id).not.toBe("child1");
    expect(childInstances[1].id).not.toBe("child2");
  });

  test("skip portal content that already exists", () => {
    const instances = new Map([
      [
        "existingPortalContent",
        {
          type: "instance" as const,
          id: "existingPortalContent",
          component: "Box",
          children: [{ type: "text" as const, value: "existing" }],
        },
      ],
    ]);
    const data = getWebstudioDataStub({ instances });

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        instances: [
          {
            type: "instance",
            id: "portal",
            component: portalComponent,
            children: [{ type: "id", value: "existingPortalContent" }],
          },
          {
            type: "instance",
            id: "existingPortalContent",
            component: "Box",
            children: [{ type: "text", value: "new version" }],
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    // Should preserve existing portal content
    const existingInstance = data.instances.get("existingPortalContent");
    expect(existingInstance?.children).toEqual([
      { type: "text", value: "existing" },
    ]);
  });

  test("insert instance with expression child and update variable references", () => {
    const data = getWebstudioDataStub();

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        instances: [
          {
            type: "instance",
            id: "box",
            component: "Box",
            children: [{ type: "expression", value: "$ws$dataSource$oldVar" }],
          },
        ],
        dataSources: [
          {
            id: "oldVar",
            scopeInstanceId: "box",
            type: "variable",
            name: "myVar",
            value: { type: "string", value: "hello" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    const newBoxId = Array.from(data.instances.keys())[0];
    const newBox = data.instances.get(newBoxId);
    const newVarId = Array.from(data.dataSources.keys())[0];

    // Verify the expression was updated with the new variable id
    expect(newBox?.children[0].type).toBe("expression");
    if (newBox?.children[0].type === "expression") {
      // The encoding replaces - with __DASH__
      const encodedId = newVarId.replace(/-/g, "__DASH__");
      expect(newBox.children[0].value).toBe(`$ws$dataSource$${encodedId}`);
    }
    expect(newVarId).not.toBe("oldVar");
  });

  test("skip global variables that already exist by id", () => {
    const dataSources = new Map([
      [
        "globalVar1",
        {
          id: "globalVar1",
          scopeInstanceId: ROOT_INSTANCE_ID,
          type: "variable" as const,
          name: "Global Var",
          value: { type: "string" as const, value: "existing" },
        },
      ],
    ]);
    const data = getWebstudioDataStub({ dataSources });

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        dataSources: [
          {
            id: "globalVar1",
            scopeInstanceId: ROOT_INSTANCE_ID,
            type: "variable",
            name: "Global Var",
            value: { type: "string", value: "new value" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    // Should preserve existing global variable
    const existingVar = data.dataSources.get("globalVar1");
    expect(existingVar?.type).toBe("variable");
    if (existingVar?.type === "variable") {
      expect(existingVar.value).toEqual({
        type: "string",
        value: "existing",
      });
    }
  });

  test("skip global variables that have conflicting names with availableVariables", () => {
    const data = getWebstudioDataStub();

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        dataSources: [
          {
            id: "newGlobal",
            scopeInstanceId: ROOT_INSTANCE_ID,
            type: "variable",
            name: "conflictingName",
            value: { type: "string", value: "value" },
          },
        ],
      },
      availableVariables: [
        {
          id: "existingId",
          scopeInstanceId: ROOT_INSTANCE_ID,
          type: "variable",
          name: "conflictingName",
          value: { type: "string", value: "existing" },
        },
      ],
      projectId: "",
    });

    // Should not insert the global variable due to name conflict
    expect(data.dataSources.has("newGlobal")).toBe(false);
  });

  test("handle mixed token and local style sources in styleSourceSelections", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources = toMap<StyleSource>([
      { id: "existingToken", type: "token", name: "Primary" },
    ]);
    const data = getWebstudioDataStub({ breakpoints, styleSources });

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
        breakpoints: [{ id: "base", label: "base" }],
        styleSourceSelections: [
          {
            instanceId: "box",
            values: ["localStyle1", "existingToken", "localStyle2"],
          },
        ],
        styleSources: [
          { id: "localStyle1", type: "local" },
          { id: "localStyle2", type: "local" },
        ],
        styles: [
          {
            styleSourceId: "localStyle1",
            breakpointId: "base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
          {
            styleSourceId: "localStyle2",
            breakpointId: "base",
            property: "fontSize",
            value: { type: "unit", value: 16, unit: "px" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    const newBoxId = Array.from(data.instances.keys())[0];
    const selection = data.styleSourceSelections.get(newBoxId);

    expect(selection?.values).toHaveLength(3);
    expect(selection?.values[1]).toBe("existingToken"); // Token preserved
    expect(selection?.values[0]).not.toBe("localStyle1"); // Local regenerated
    expect(selection?.values[2]).not.toBe("localStyle2"); // Local regenerated

    // Verify both local styles were created with new ids
    const localStyles = Array.from(data.styleSources.values()).filter(
      (s) => s.type === "local"
    );
    expect(localStyles).toHaveLength(2);
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
          <$.Image ws:id="imageId"></$.Image>
        </$.Paragraph>
      </$.Body>
    );
    $instances.set(instances);
    selectInstance(["imageId", "paragraphId", "bodyId"]);
    expect(
      findClosestInsertable(renderTemplate(<$.Box ws:tag="span"></$.Box>))
    ).toEqual({
      parentSelector: ["paragraphId", "bodyId"],
      position: 1,
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

  test("allow inserting list item in body even though validation fails", () => {
    const { instances } = renderData(<$.Body ws:id="bodyId"></$.Body>);
    $instances.set(instances);
    selectInstance(["bodyId"]);
    const newListItemFragment = renderTemplate(
      <$.ListItem ws:id="newListItemId"></$.ListItem>
    );
    expect(findClosestInsertable(newListItemFragment)).toEqual({
      parentSelector: ["bodyId"],
      position: "end",
    });
  });
});

test("get undefined instead of instance path when no instances found", () => {
  expect(getInstancePath(["boxId"], new Map())).toEqual(undefined);
});

describe("buildInstancePath", () => {
  const createPages = () =>
    createDefaultPages({
      homePageId: "homePageId",
      rootInstanceId: "rootId",
      systemDataSourceId: "systemId",
    });

  test("returns empty array when instance has no selector", () => {
    const pages = createPages();
    const instances = new Map();

    const result = buildInstancePath("nonexistent", pages, instances);
    expect(result).toEqual([]);
  });

  test("returns empty array for root instance (no ancestors)", () => {
    const { instances } = renderData(
      <$.Body ws:id="rootId">
        <$.Box ws:id="boxId"></$.Box>
      </$.Body>
    );
    const pages = createPages();

    const result = buildInstancePath("rootId", pages, instances);
    expect(result).toEqual([]);
  });

  test("builds path for single-level nesting", () => {
    const { instances } = renderData(
      <$.Body ws:id="rootId">
        <$.Box ws:id="boxId"></$.Box>
      </$.Body>
    );
    const pages = createPages();

    const result = buildInstancePath("boxId", pages, instances);
    expect(result).toEqual(["Body"]);
  });

  test("builds path for multi-level nesting", () => {
    const { instances } = renderData(
      <$.Body ws:id="rootId">
        <$.Box ws:id="containerId">
          <$.Heading ws:id="headingId"></$.Heading>
        </$.Box>
      </$.Body>
    );
    const pages = createPages();

    const result = buildInstancePath("headingId", pages, instances);
    expect(result).toEqual(["Body", "Box"]);
  });

  test("builds path for deeply nested instance", () => {
    const { instances } = renderData(
      <$.Body ws:id="rootId">
        <$.Box ws:id="sectionId">
          <$.Box ws:id="articleId">
            <$.Box ws:id="divId">
              <$.Text ws:id="textId"></$.Text>
            </$.Box>
          </$.Box>
        </$.Box>
      </$.Body>
    );
    const pages = createPages();

    const result = buildInstancePath("textId", pages, instances);
    expect(result).toEqual(["Body", "Box", "Box", "Box"]);
  });

  test("handles instances with custom labels", () => {
    const { instances } = renderData(
      <$.Body ws:id="rootId" ws:label="Main Body">
        <$.Box ws:id="navId" ws:label="Navigation">
          <$.Link ws:id="linkId" ws:label="Home Link"></$.Link>
        </$.Box>
      </$.Body>
    );
    const pages = createPages();

    const result = buildInstancePath("linkId", pages, instances);
    expect(result).toEqual(["Main Body", "Navigation"]);
  });
});

describe("toggleInstanceShow", () => {
  test("creates show prop with false value when it doesn't exist", () => {
    const { instances } = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="box"></$.Box>
      </$.Body>
    );
    $instances.set(instances);
    $props.set(new Map());
    $pages.set(createDefaultPages({ rootInstanceId: "body" }));

    toggleInstanceShow("box");

    const props = $props.get();
    const showProp = Array.from(props.values()).find(
      (prop) => prop.instanceId === "box" && prop.name === showAttribute
    );
    expect(showProp).toEqual({
      id: expect.any(String),
      instanceId: "box",
      name: showAttribute,
      type: "boolean",
      value: false,
    });
  });

  test("toggles show prop from true to false", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="box" ws:show={true}></$.Box>
      </$.Body>
    );
    $instances.set(instances);
    $props.set(props);
    $pages.set(createDefaultPages({ rootInstanceId: "body" }));

    toggleInstanceShow("box");

    const updatedProps = $props.get();
    const showProp = Array.from(updatedProps.values()).find(
      (prop) => prop.instanceId === "box" && prop.name === showAttribute
    );
    expect(showProp?.type).toBe("boolean");
    if (showProp?.type === "boolean") {
      expect(showProp.value).toBe(false);
    }
  });

  test("toggles show prop from false to true", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="box" ws:show={false}></$.Box>
      </$.Body>
    );
    $instances.set(instances);
    $props.set(props);
    $pages.set(createDefaultPages({ rootInstanceId: "body" }));

    toggleInstanceShow("box");

    const updatedProps = $props.get();
    const showProp = Array.from(updatedProps.values()).find(
      (prop) => prop.instanceId === "box" && prop.name === showAttribute
    );
    expect(showProp?.type).toBe("boolean");
    if (showProp?.type === "boolean") {
      expect(showProp.value).toBe(true);
    }
  });
});

describe("unwrap instance", () => {
  test("unwraps instance and moves children to parent", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="parent">
          <$.Box ws:id="wrapper">
            <$.Box ws:id="child1"></$.Box>
            <$.Box ws:id="child2"></$.Box>
          </$.Box>
        </$.Box>
      </$.Body>
    );

    const selectedItem = {
      instanceSelector: ["wrapper", "parent", "body"],
      instance: instances.get("wrapper")!,
    };
    const parentItem = {
      instanceSelector: ["parent", "body"],
      instance: instances.get("parent")!,
    };

    const result = unwrapInstanceMutable({
      instances,
      props,
      metas: defaultMetasMap,
      selectedItem,
      parentItem,
    });

    expect(result.success).toBe(true);
    expect(instances.has("parent")).toBe(false);
    const bodyInstance = instances.get("body")!;
    expect(bodyInstance.children).toEqual([{ type: "id", value: "wrapper" }]);
  });

  test("fails to unwrap textual instance", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="box">
          <$.Paragraph ws:id="paragraph">
            <$.Bold ws:id="bold">text</$.Bold>
          </$.Paragraph>
        </$.Box>
      </$.Body>
    );

    const selectedItem = {
      instanceSelector: ["bold", "paragraph", "box", "body"],
      instance: instances.get("bold")!,
    };
    const parentItem = {
      instanceSelector: ["paragraph", "box", "body"],
      instance: instances.get("paragraph")!,
    };

    const result = unwrapInstanceMutable({
      instances,
      props,
      metas: defaultMetasMap,
      selectedItem,
      parentItem,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Cannot unwrap textual instance");
  });

  test("fails to unwrap if content model is violated", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="outerBox">
          <$.Form ws:id="form">
            <$.Box ws:id="innerBox">
              <$.Form ws:id="nestedForm"></$.Form>
            </$.Box>
          </$.Form>
        </$.Box>
      </$.Body>
    );

    const selectedItem = {
      instanceSelector: ["form", "outerBox", "body"],
      instance: instances.get("form")!,
    };
    const parentItem = {
      instanceSelector: ["outerBox", "body"],
      instance: instances.get("outerBox")!,
    };

    const result = unwrapInstanceMutable({
      instances,
      props,
      metas: defaultMetasMap,
      selectedItem,
      parentItem,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Cannot unwrap instance");
  });

  test("unwrapping replaces parent with selected in grandparent", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="parent">
          <$.Box ws:id="child"></$.Box>
        </$.Box>
      </$.Body>
    );

    const selectedItem = {
      instanceSelector: ["child", "parent", "body"],
      instance: instances.get("child")!,
    };
    const parentItem = {
      instanceSelector: ["parent", "body"],
      instance: instances.get("parent")!,
    };

    const result = unwrapInstanceMutable({
      instances,
      props,
      metas: defaultMetasMap,
      selectedItem,
      parentItem,
    });

    expect(result.success).toBe(true);
    expect(instances.has("parent")).toBe(false);
    expect(instances.has("child")).toBe(true);
    const bodyInstance = instances.get("body")!;
    expect(bodyInstance.children).toEqual([{ type: "id", value: "child" }]);
  });

  test("unwrapping removes selected from parent and moves it to grandparent", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="parent">
          <$.Image ws:id="image"></$.Image>
          <$.Link ws:id="link"></$.Link>
        </$.Box>
      </$.Body>
    );

    const selectedItem = {
      instanceSelector: ["image", "parent", "body"],
      instance: instances.get("image")!,
    };
    const parentItem = {
      instanceSelector: ["parent", "body"],
      instance: instances.get("parent")!,
    };

    const result = unwrapInstanceMutable({
      instances,
      props,
      metas: defaultMetasMap,
      selectedItem,
      parentItem,
    });

    expect(result.success).toBe(true);
    expect(instances.has("parent")).toBe(true); // Parent still exists
    expect(instances.has("image")).toBe(true);
    expect(instances.has("link")).toBe(true);

    const bodyInstance = instances.get("body")!;
    expect(bodyInstance.children).toEqual([
      { type: "id", value: "parent" },
      { type: "id", value: "image" },
    ]);

    const parentInstance = instances.get("parent")!;
    expect(parentInstance.children).toEqual([{ type: "id", value: "link" }]);
  });
});

describe("canUnwrapInstance", () => {
  beforeEach(() => {
    $project.set({ id: "projectId" } as Project);
    $registeredComponentMetas.set(defaultMetasMap);
  });

  test("returns true for unwrappable instance", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="parent">
          <$.Box ws:id="wrapper">
            <$.Box ws:id="child"></$.Box>
          </$.Box>
        </$.Box>
      </$.Body>
    );

    $instances.set(instances);
    $props.set(props);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $awareness.set({ pageId: pages.homePage.id });

    const instancePath = [
      {
        instanceSelector: ["wrapper", "parent", "body"],
        instance: instances.get("wrapper")!,
      },
      {
        instanceSelector: ["parent", "body"],
        instance: instances.get("parent")!,
      },
      {
        instanceSelector: ["body"],
        instance: instances.get("body")!,
      },
    ] satisfies InstancePath;

    expect(canUnwrapInstance(instancePath)).toBe(true);
  });

  test("returns false if parent is root instance", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="box"></$.Box>
      </$.Body>
    );

    $instances.set(instances);
    $props.set(props);
    $registeredComponentMetas.set(defaultMetasMap);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $awareness.set({ pageId: pages.homePage.id });

    const instancePath = [
      {
        instanceSelector: ["box", "body"],
        instance: instances.get("box")!,
      },
      {
        instanceSelector: ["body"],
        instance: instances.get("body")!,
      },
    ] satisfies InstancePath;

    expect(canUnwrapInstance(instancePath)).toBe(false);
  });

  test("returns false for textual instance", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Paragraph ws:id="paragraph">
          <$.Bold ws:id="bold">text</$.Bold>
        </$.Paragraph>
      </$.Body>
    );

    $instances.set(instances);
    $props.set(props);
    $registeredComponentMetas.set(defaultMetasMap);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $awareness.set({ pageId: pages.homePage.id });

    const instancePath = [
      {
        instanceSelector: ["bold", "paragraph", "body"],
        instance: instances.get("bold")!,
      },
      {
        instanceSelector: ["paragraph", "body"],
        instance: instances.get("paragraph")!,
      },
    ] satisfies InstancePath;

    expect(canUnwrapInstance(instancePath)).toBe(false);
  });

  test("returns true for Body > div > a scenario", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <ws.element ws:tag="div" ws:id="div">
          <ws.element ws:tag="a" ws:id="link">
            Link text
          </ws.element>
        </ws.element>
      </$.Body>
    );

    $instances.set(instances);
    $props.set(props);
    $registeredComponentMetas.set(defaultMetasMap);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $awareness.set({ pageId: pages.homePage.id });

    const instancePath = [
      {
        instanceSelector: ["link", "div", "body"],
        instance: instances.get("link")!,
      },
      {
        instanceSelector: ["div", "body"],
        instance: instances.get("div")!,
      },
      {
        instanceSelector: ["body"],
        instance: instances.get("body")!,
      },
    ] satisfies InstancePath;

    // Should be able to unwrap the link from the div
    expect(canUnwrapInstance(instancePath)).toBe(true);
  });

  test("unwrapInstanceMutable works for Body > div > a scenario", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <ws.element ws:tag="div" ws:id="div">
          <ws.element ws:tag="a" ws:id="link">
            Link text
          </ws.element>
        </ws.element>
      </$.Body>
    );

    const result = unwrapInstanceMutable({
      instances,
      props,
      metas: defaultMetasMap,
      selectedItem: {
        instanceSelector: ["link", "div", "body"],
        instance: instances.get("link")!,
      },
      parentItem: {
        instanceSelector: ["div", "body"],
        instance: instances.get("div")!,
      },
    });

    expect(result.success).toBe(true);

    // Verify the link is now a direct child of body
    const body = instances.get("body")!;
    expect(body.children).toContainEqual({ type: "id", value: "link" });

    // Verify the div was deleted since it has no more children
    expect(instances.has("div")).toBe(false);
  });
});

describe("canConvertInstance", () => {
  test("returns true for valid conversion", () => {
    const { instances, props } = renderData(
      <ws.element ws:tag="body" ws:id="body">
        <$.Box ws:id="box"></$.Box>
      </ws.element>
    );

    const result = canConvertInstance(
      "box",
      ["box", "body"],
      elementComponent,
      "div",
      instances,
      props,
      defaultMetasMap
    );

    expect(result).toBe(true);
  });

  test("returns false for non-existent instance", () => {
    const { instances, props } = renderData(
      <ws.element ws:tag="body" ws:id="body"></ws.element>
    );

    const result = canConvertInstance(
      "nonexistent",
      ["nonexistent", "body"],
      elementComponent,
      "div",
      instances,
      props,
      defaultMetasMap
    );

    expect(result).toBe(false);
  });

  test("returns true when converting Box to Heading", () => {
    const { instances, props } = renderData(
      <ws.element ws:tag="body" ws:id="body">
        <$.Box ws:id="box"></$.Box>
      </ws.element>
    );

    const result = canConvertInstance(
      "box",
      ["box", "body"],
      "@webstudio-is/sdk-components-react:Heading",
      undefined,
      instances,
      props,
      defaultMetasMap
    );

    expect(result).toBe(true);
  });

  test("uses preset tag when available", () => {
    const { instances, props } = renderData(
      <ws.element ws:tag="body" ws:id="body">
        <$.Box ws:id="box"></$.Box>
      </ws.element>
    );

    const result = canConvertInstance(
      "box",
      ["box", "body"],
      "@webstudio-is/sdk-components-react:Heading",
      undefined,
      instances,
      props,
      defaultMetasMap
    );

    expect(result).toBe(true);
  });
});

describe("convertInstance", () => {
  beforeEach(() => {
    $registeredComponentMetas.set(defaultMetasMap);
  });

  test("converts legacy tag to element", () => {
    const { instances, props } = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <$.Box tag="article" ws:id="articleId"></$.Box>
      </ws.element>
    );
    $instances.set(instances);
    $props.set(props);
    selectInstance(["articleId", "bodyId"]);
    convertInstance(elementComponent);
    const { instances: newInstances, props: newProps } = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <ws.element ws:tag="article" ws:id="articleId"></ws.element>
      </ws.element>
    );
    expect({ instances: $instances.get(), props: $props.get() }).toEqual({
      instances: newInstances,
      props: newProps,
    });
  });

  test("migrates legacy properties", () => {
    const { instances, props } = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <$.Box
          ws:tag="div"
          ws:id="divId"
          className="my-class"
          htmlFor="my-id"
        ></$.Box>
      </ws.element>
    );
    $instances.set(instances);
    $props.set(props);
    selectInstance(["divId", "bodyId"]);
    convertInstance(elementComponent);
    const { instances: newInstances, props: newProps } = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <ws.element
          ws:tag="div"
          ws:id="divId"
          class="my-class"
          for="my-id"
        ></ws.element>
      </ws.element>
    );
    expect({ instances: $instances.get(), props: $props.get() }).toEqual({
      instances: newInstances,
      props: newProps,
    });
  });

  test("preserves currently specified tag", () => {
    $instances.set(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <$.Box ws:tag="article" ws:id="articleId"></$.Box>
        </ws.element>
      ).instances
    );
    selectInstance(["articleId", "bodyId"]);
    convertInstance(elementComponent);
    expect($instances.get()).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="article" ws:id="articleId"></ws.element>
        </ws.element>
      ).instances
    );
  });

  test("converts to first tag from presets", () => {
    $instances.set(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <$.Heading ws:id="headingId"></$.Heading>
        </ws.element>
      ).instances
    );
    selectInstance(["headingId", "bodyId"]);
    convertInstance(elementComponent);
    expect($instances.get()).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="h1" ws:id="headingId"></ws.element>
        </ws.element>
      ).instances
    );
  });

  test("falls back to div", () => {
    $instances.set(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <$.Box ws:id="divId"></$.Box>
        </ws.element>
      ).instances
    );
    selectInstance(["divId", "bodyId"]);
    convertInstance(elementComponent);
    expect($instances.get()).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="div" ws:id="divId"></ws.element>
        </ws.element>
      ).instances
    );
  });

  test("converts with specific tag", () => {
    $instances.set(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <$.Box ws:id="divId"></$.Box>
        </ws.element>
      ).instances
    );
    selectInstance(["divId", "bodyId"]);
    convertInstance(elementComponent, "a");
    expect($instances.get()).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="a" ws:id="divId"></ws.element>
        </ws.element>
      ).instances
    );
  });

  test("converts between components", () => {
    $instances.set(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <$.Box ws:id="boxId"></$.Box>
        </ws.element>
      ).instances
    );
    selectInstance(["boxId", "bodyId"]);
    convertInstance("@webstudio-is/sdk-components-react:Heading");
    const result = $instances.get();
    const boxInstance = result.get("boxId");
    expect(boxInstance?.component).toBe(
      "@webstudio-is/sdk-components-react:Heading"
    );
  });

  test("prevents converting root instance", () => {
    const initialInstances = renderData(
      <ws.element ws:tag="html" ws:id="rootId">
        <ws.element ws:tag="body" ws:id="bodyId"></ws.element>
      </ws.element>
    ).instances;
    $instances.set(initialInstances);
    selectInstance(["rootId"]);
    convertInstance(elementComponent, "div");
    // Should not change
    expect($instances.get()).toEqual(initialInstances);
  });

  test("prevents converting body instance", () => {
    const pages = createDefaultPages({ rootInstanceId: "bodyId" });
    $pages.set(pages);
    $awareness.set({ pageId: pages.homePage.id });

    const initialInstances = renderData(
      <ws.element ws:tag="html" ws:id="rootId">
        <ws.element ws:tag="body" ws:id="bodyId">
          <$.Box ws:id="boxId"></$.Box>
        </ws.element>
      </ws.element>
    ).instances;
    $instances.set(initialInstances);
    selectInstance(["bodyId", "rootId"]);
    convertInstance(elementComponent, "div");
    // Should not change
    expect($instances.get()).toEqual(initialInstances);
  });
});

describe("deleteSelectedInstance", () => {
  test("delete selected instance and select next one", () => {
    const { instances } = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="parent">
          <$.Box ws:id="child1"></$.Box>
          <$.Box ws:id="child2"></$.Box>
          <$.Box ws:id="child3"></$.Box>
        </$.Box>
      </$.Body>
    );
    $instances.set(instances);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $awareness.set({ pageId: pages.homePage.id });
    selectInstance(["child2", "parent", "body"]);
    deleteSelectedInstance();
    expect($awareness.get()?.instanceSelector).toEqual([
      "child3",
      "parent",
      "body",
    ]);
  });

  test("delete selected instance and select previous one", () => {
    const { instances } = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="parent">
          <$.Box ws:id="child1"></$.Box>
          <$.Box ws:id="child2"></$.Box>
          <$.Box ws:id="child3"></$.Box>
        </$.Box>
      </$.Body>
    );
    $instances.set(instances);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $awareness.set({ pageId: pages.homePage.id });
    selectInstance(["child3", "parent", "body"]);
    deleteSelectedInstance();
    expect($awareness.get()?.instanceSelector).toEqual([
      "child2",
      "parent",
      "body",
    ]);
  });

  test("delete selected instance and select parent one", () => {
    const { instances } = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="parent">
          <$.Box ws:id="child1"></$.Box>
        </$.Box>
      </$.Body>
    );
    $instances.set(instances);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $awareness.set({ pageId: pages.homePage.id });
    selectInstance(["child1", "parent", "body"]);
    deleteSelectedInstance();
    expect($awareness.get()?.instanceSelector).toEqual(["parent", "body"]);
  });
});

describe("insertWebstudioFragmentAt with conflictResolution", () => {
  beforeEach(() => {
    $project.set({ id: "project-id" } as Project);
  });

  test("uses conflictResolution='theirs' by default (creates new token with suffix)", () => {
    // Existing project with a "primary" token (used by existing-box)
    const data = renderData(
      <$.Body ws:id="body">
        <$.Box
          ws:id="existing-box"
          ws:tokens={[
            token(
              "primary",
              css`
                color: blue;
              `
            ),
          ]}
        ></$.Box>
      </$.Body>
    );

    // Create fragment with token that has same name but different styles
    const fragment = renderTemplate(
      <$.Box
        ws:id="box"
        ws:tokens={[
          token(
            "primary",
            css`
              color: red;
            `
          ),
        ]}
      ></$.Box>
    );

    setDataStores(data);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $awareness.set({ pageId: pages.homePage.id });
    selectInstance(["body"]);

    // Insert without explicit conflictResolution (defaults to "theirs")
    insertWebstudioFragmentAt(fragment, {
      parentSelector: ["body"],
      position: "end",
    });

    // The existing token should still have blue color (unchanged)
    const styles = Array.from($styles.get().values());
    const styleSources = Array.from($styleSources.get().values());
    const existingToken = styleSources.find(
      (s) => s.type === "token" && s.name === "primary"
    );
    const existingTokenStyle = styles.find(
      (s) =>
        s.styleSourceId === existingToken?.id &&
        s.property === "color" &&
        s.breakpointId === "base"
    );
    expect(existingTokenStyle?.value).toEqual({
      type: "keyword",
      value: "blue",
    });

    // A new token "primary-1" should be created with red color
    const newToken = styleSources.find(
      (s) => s.type === "token" && s.name === "primary-1"
    );
    expect(newToken).toBeDefined();
    const newTokenStyle = styles.find(
      (s) =>
        s.styleSourceId === newToken?.id &&
        s.property === "color" &&
        s.breakpointId === "base"
    );
    expect(newTokenStyle?.value).toEqual({ type: "keyword", value: "red" });
  });

  test("uses conflictResolution='ours' to keep existing token styles", () => {
    // Existing project with a "primary" token (used by existing-box)
    const data = renderData(
      <$.Body ws:id="body">
        <$.Box
          ws:id="existing-box"
          ws:tokens={[
            token(
              "primary",
              css`
                color: blue;
              `
            ),
          ]}
        ></$.Box>
      </$.Body>
    );

    const fragment = renderTemplate(
      <$.Box
        ws:id="box"
        ws:tokens={[
          token(
            "primary",
            css`
              color: red;
            `
          ),
        ]}
      ></$.Box>
    );

    setDataStores(data);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $awareness.set({ pageId: pages.homePage.id });
    selectInstance(["body"]);

    // Insert with conflictResolution="ours" to keep existing styles
    insertWebstudioFragmentAt(
      fragment,
      {
        parentSelector: ["body"],
        position: "end",
      },
      "ours"
    );

    // The existing token should still have blue color (kept original)
    const styles = Array.from($styles.get().values());
    const styleSources = Array.from($styleSources.get().values());
    const existingToken = styleSources.find(
      (s) => s.type === "token" && s.name === "primary"
    );
    const primaryTokenStyle = styles.find(
      (s) =>
        s.styleSourceId === existingToken?.id &&
        s.property === "color" &&
        s.breakpointId === "base"
    );
    expect(primaryTokenStyle?.value).toEqual({
      type: "keyword",
      value: "blue",
    });

    // No new token should be created
    const newToken = styleSources.find(
      (s) => s.type === "token" && s.name === "primary-1"
    );
    expect(newToken).toBeUndefined();
  });

  test("uses conflictResolution='merge' to merge styles (theirs overrides)", () => {
    // Existing project with a "primary" token that has color and fontSize
    const data = renderData(
      <$.Body ws:id="body">
        <$.Box
          ws:id="existing-box"
          ws:tokens={[
            token(
              "primary",
              css`
                color: blue;
                font-size: 16px;
              `
            ),
          ]}
        ></$.Box>
      </$.Body>
    );

    // Fragment with same "primary" token but different color and new property
    const fragment = renderTemplate(
      <$.Box
        ws:id="box"
        ws:tokens={[
          token(
            "primary",
            css`
              color: red;
              font-weight: bold;
            `
          ),
        ]}
      ></$.Box>
    );

    setDataStores(data);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $awareness.set({ pageId: pages.homePage.id });
    selectInstance(["body"]);

    // Insert with conflictResolution="merge"
    insertWebstudioFragmentAt(
      fragment,
      {
        parentSelector: ["body"],
        position: "end",
      },
      "merge"
    );

    // The existing token should now have red color (overridden by fragment)
    const styles = Array.from($styles.get().values());
    const styleSources = Array.from($styleSources.get().values());
    const existingToken = styleSources.find(
      (s) => s.type === "token" && s.name === "primary"
    );
    const colorStyle = styles.find(
      (s) =>
        s.styleSourceId === existingToken?.id &&
        s.property === "color" &&
        s.breakpointId === "base"
    );
    expect(colorStyle?.value).toEqual({ type: "keyword", value: "red" });

    // fontSize should still be there (not in fragment, so kept)
    const fontSizeStyle = styles.find(
      (s) =>
        s.styleSourceId === existingToken?.id &&
        s.property === "fontSize" &&
        s.breakpointId === "base"
    );
    expect(fontSizeStyle?.value).toEqual({
      type: "unit",
      value: 16,
      unit: "px",
    });

    // fontWeight should be added from fragment
    const fontWeightStyle = styles.find(
      (s) =>
        s.styleSourceId === existingToken?.id &&
        s.property === "fontWeight" &&
        s.breakpointId === "base"
    );
    expect(fontWeightStyle?.value).toEqual({ type: "keyword", value: "bold" });

    // No new token should be created
    const newToken = styleSources.find(
      (s) => s.type === "token" && s.name === "primary-1"
    );
    expect(newToken).toBeUndefined();
  });
});

describe("detectPageTokenConflicts", () => {
  beforeEach(() => {
    $project.set({ id: "project-id" } as Project);
  });

  test("returns empty array when no conflicts exist", () => {
    // Set up target project data (no tokens)
    const targetData = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="existing-box"></$.Box>
      </$.Body>
    );
    setDataStores(targetData);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);

    // Create source data with a token
    const sourceData = renderData(
      <$.Body ws:id="source-body">
        <$.Box
          ws:id="source-box"
          ws:tokens={[
            token(
              "primary",
              css`
                color: red;
              `
            ),
          ]}
        ></$.Box>
      </$.Body>
    );
    const sourcePages = createDefaultPages({ rootInstanceId: "source-body" });
    const sourceWebstudioData: WebstudioData = {
      ...sourceData,
      pages: sourcePages,
    };

    const conflicts = detectPageTokenConflicts({
      sourceData: sourceWebstudioData,
      pageId: sourcePages.homePage.id,
    });

    // No conflicts
    expect(conflicts).toEqual([]);
  });

  test("returns conflicts when token conflicts exist", () => {
    // Set up target project with a "primary" token
    const targetData = renderData(
      <$.Body ws:id="body">
        <$.Box
          ws:id="existing-box"
          ws:tokens={[
            token(
              "primary",
              css`
                color: blue;
              `
            ),
          ]}
        ></$.Box>
      </$.Body>
    );
    setDataStores(targetData);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);

    // Create source data with same "primary" token but different styles
    const sourceData = renderData(
      <$.Body ws:id="source-body">
        <$.Box
          ws:id="source-box"
          ws:tokens={[
            token(
              "primary",
              css`
                color: red;
              `
            ),
          ]}
        ></$.Box>
      </$.Body>
    );
    const sourcePages = createDefaultPages({ rootInstanceId: "source-body" });
    const sourceWebstudioData: WebstudioData = {
      ...sourceData,
      pages: sourcePages,
    };

    const conflicts = detectPageTokenConflicts({
      sourceData: sourceWebstudioData,
      pageId: sourcePages.homePage.id,
    });

    // Should return conflicts
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].tokenName).toBe("primary");
  });

  test("detects conflicts from ROOT_INSTANCE tokens", () => {
    // Set up target project with a "header" token
    const targetData = renderData(
      <$.Body ws:id="body">
        <$.Box
          ws:id="existing-box"
          ws:tokens={[
            token(
              "header",
              css`
                background: white;
              `
            ),
          ]}
        ></$.Box>
      </$.Body>
    );
    setDataStores(targetData);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);

    // Create source data with a ROOT_INSTANCE that has conflicting "header" token
    const sourceBodyData = renderData(
      <$.Body ws:id="source-body">
        <$.Box ws:id="source-box"></$.Box>
      </$.Body>
    );
    // Add a global "header" token with different styles (simulating ROOT_INSTANCE content)
    const headerTokenId = "header-token-id";
    sourceBodyData.styleSources.set(headerTokenId, {
      type: "token",
      id: headerTokenId,
      name: "header",
    });
    const baseBreakpointId = Array.from(
      sourceBodyData.breakpoints.values()
    ).find((b) => b.minWidth === undefined)?.id;
    if (baseBreakpointId) {
      sourceBodyData.styles.set(`${headerTokenId}:base:backgroundColor`, {
        styleSourceId: headerTokenId,
        breakpointId: baseBreakpointId,
        property: "backgroundColor",
        value: { type: "keyword", value: "black" },
      });
    }
    // Add ROOT_INSTANCE with the header token
    sourceBodyData.instances.set(ROOT_INSTANCE_ID, {
      type: "instance",
      id: ROOT_INSTANCE_ID,
      component: "Box",
      children: [],
    });
    sourceBodyData.styleSourceSelections.set(ROOT_INSTANCE_ID, {
      instanceId: ROOT_INSTANCE_ID,
      values: [headerTokenId],
    });

    const sourcePages = createDefaultPages({ rootInstanceId: "source-body" });
    const sourceWebstudioData: WebstudioData = {
      ...sourceBodyData,
      pages: sourcePages,
    };

    const conflicts = detectPageTokenConflicts({
      sourceData: sourceWebstudioData,
      pageId: sourcePages.homePage.id,
    });

    // Should detect conflict from ROOT_INSTANCE token
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].tokenName).toBe("header");
  });

  test("throws error when page not found", () => {
    const targetData = renderData(<$.Body ws:id="body"></$.Body>);
    setDataStores(targetData);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);

    const sourceData = renderData(<$.Body ws:id="source-body"></$.Body>);
    const sourcePages = createDefaultPages({ rootInstanceId: "source-body" });
    const sourceWebstudioData: WebstudioData = {
      ...sourceData,
      pages: sourcePages,
    };

    expect(() =>
      detectPageTokenConflicts({
        sourceData: sourceWebstudioData,
        pageId: "non-existent-page-id",
      })
    ).toThrow("Page not found");
  });
});
