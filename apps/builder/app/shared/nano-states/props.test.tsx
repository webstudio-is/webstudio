import { beforeEach, expect, test } from "vitest";
import { cleanStores } from "nanostores";
import { createDefaultPages } from "@webstudio-is/project-build";
import { setEnv } from "@webstudio-is/feature-flags";
import {
  DataSource,
  type Instance,
  ROOT_INSTANCE_ID,
  collectionComponent,
} from "@webstudio-is/sdk";
import { textContentAttribute } from "@webstudio-is/react-sdk";
import { $instances } from "./instances";
import {
  $propValuesByInstanceSelector,
  $variableValuesByInstanceSelector,
} from "./props";
import { $pages } from "./pages";
import { $assets, $dataSources, $props, $resources } from "./misc";
import { $dataSourceVariables, $resourceValues } from "./variables";
import { $awareness, getInstanceKey } from "../awareness";
import {
  $,
  expression,
  Parameter,
  renderData,
  ResourceValue,
  Variable,
  ws,
} from "@webstudio-is/template";
import { updateCurrentSystem } from "../system";
import { registerContainers } from "../sync";

registerContainers();
setEnv("*");

const getIdValuePair = <T extends { id: string }>(item: T) =>
  [item.id, item] as const;

const toMap = <T extends { id: string }>(list: T[]) =>
  new Map(list.map(getIdValuePair));

const setBoxInstance = (id: Instance["id"]) => {
  $instances.set(
    toMap([{ id, type: "instance", component: "Box", children: [] }])
  );
};

const selectPageRoot = (
  rootInstanceId: Instance["id"],
  systemDataSourceId: DataSource["id"] = "systemId"
) => {
  const defaultPages = createDefaultPages({
    homePageId: "pageId",
    rootInstanceId,
    systemDataSourceId,
  });
  $pages.set(defaultPages);
  $awareness.set({ pageId: defaultPages.homePage.id });
};

beforeEach(() => {
  $instances.set(new Map());
  $props.set(new Map());
  $resources.set(new Map());
  $dataSources.set(new Map());
  $dataSourceVariables.set(new Map());
  $resourceValues.set(new Map());
});

test("collect prop values", () => {
  setBoxInstance("box");
  selectPageRoot("box");
  $dataSources.set(new Map());
  $props.set(
    toMap([
      {
        id: "prop1",
        name: "first",
        instanceId: "box",
        type: "number",
        value: 0,
      },
      {
        id: "prop2",
        name: "second",
        instanceId: "box",
        type: "json",
        value: { name: "John" },
      },
    ])
  );
  expect(
    $propValuesByInstanceSelector.get().get(JSON.stringify(["box"]))
  ).toEqual(
    new Map<string, unknown>([
      ["first", 0],
      ["second", { name: "John" }],
    ])
  );

  cleanStores($propValuesByInstanceSelector);
});

test("compute expression prop values", () => {
  setBoxInstance("box");
  selectPageRoot("box");
  $dataSources.set(
    toMap([
      {
        id: "var1",
        scopeInstanceId: "box",
        type: "variable",
        name: "",
        value: { type: "number", value: 1 },
      },
      {
        id: "var2",
        scopeInstanceId: "box",
        type: "variable",
        name: "",
        value: { type: "string", value: "Hello" },
      },
    ])
  );
  $props.set(
    toMap([
      {
        id: "prop1",
        name: "first",
        instanceId: "box",
        type: "expression",
        value: `$ws$dataSource$var1 + 2`,
      },
      {
        id: "prop2",
        name: "second",
        instanceId: "box",
        type: "expression",
        value: `$ws$dataSource$var2 + ' World!'`,
      },
      {
        id: "prop3",
        name: "third",
        instanceId: "box",
        type: "expression",
        // do not fail when access fields of undefined
        value: `$ws$dataSource$var1.second.third || "something"`,
      },
    ])
  );
  expect(
    $propValuesByInstanceSelector.get().get(JSON.stringify(["box"]))
  ).toEqual(
    new Map<string, unknown>([
      ["first", 3],
      ["second", "Hello World!"],
      ["third", "something"],
    ])
  );

  $dataSourceVariables.set(new Map([["var1", 4]]));
  expect(
    $propValuesByInstanceSelector.get().get(JSON.stringify(["box"]))
  ).toEqual(
    new Map<string, unknown>([
      ["first", 6],
      ["second", "Hello World!"],
      ["third", "something"],
    ])
  );

  cleanStores($propValuesByInstanceSelector);
});

test("generate action prop callbacks", () => {
  setBoxInstance("box");
  selectPageRoot("box");
  $dataSources.set(
    toMap([
      {
        id: "var",
        scopeInstanceId: "box",
        type: "variable",
        name: "",
        value: { type: "number", value: 1 },
      },
    ])
  );
  $props.set(
    toMap([
      {
        id: "valueId",
        name: "value",
        instanceId: "box",
        type: "expression",
        value: `$ws$dataSource$var`,
      },
      {
        id: "actionId",
        name: "onChange",
        instanceId: "box",
        type: "action",
        value: [
          {
            type: "execute",
            args: [],
            code: `$ws$dataSource$var = $ws$dataSource$var + 1`,
          },
        ],
      },
    ])
  );
  const values1 = $propValuesByInstanceSelector
    .get()
    .get(JSON.stringify(["box"]));
  expect(values1?.get("value")).toEqual(1);

  (values1?.get("onChange") as () => void)();
  const values2 = $propValuesByInstanceSelector
    .get()
    .get(JSON.stringify(["box"]));
  expect(values2?.get("value")).toEqual(2);

  cleanStores($propValuesByInstanceSelector);
});

test("resolve asset prop values", () => {
  setBoxInstance("box");
  selectPageRoot("box");
  $dataSources.set(new Map());
  $assets.set(
    toMap([
      {
        id: "assetId",
        type: "image",
        name: "my-file.jpg",
        format: "jpeg",
        size: 0,
        projectId: "",
        createdAt: "",
        meta: { width: 0, height: 0 },
        description: "",
      },
    ])
  );
  $props.set(
    toMap([
      {
        id: "propId",
        name: "myAsset",
        instanceId: "box",
        type: "asset",
        value: "assetId",
      },
    ])
  );
  expect(
    $propValuesByInstanceSelector.get().get(JSON.stringify(["box"]))
  ).toEqual(
    new Map<string, unknown>([
      ["$webstudio$canvasOnly$assetId", "assetId"],
      ["myAsset", "/cgi/asset/my-file.jpg"],
    ])
  );

  cleanStores($propValuesByInstanceSelector);
});

test("resolve page prop values", () => {
  setBoxInstance("box");
  selectPageRoot("box");
  $dataSources.set(new Map());
  $props.set(
    toMap([
      {
        id: "propId",
        name: "myPage",
        instanceId: "box",
        type: "page",
        value: "pageId",
      },
    ])
  );
  expect(
    $propValuesByInstanceSelector.get().get(JSON.stringify(["box"]))
  ).toEqual(new Map<string, unknown>([["myPage", "/"]]));

  cleanStores($propValuesByInstanceSelector);
});

test("compute expression from collection items", () => {
  $instances.set(
    toMap([
      {
        id: "list",
        type: "instance",
        component: collectionComponent,
        children: [{ type: "id", value: "item" }],
      },
      {
        id: "item",
        type: "instance",
        component: "Box",
        children: [],
      },
    ])
  );
  selectPageRoot("list");
  $dataSources.set(
    toMap([
      {
        id: "itemId",
        scopeInstanceId: "list",
        type: "parameter",
        name: "item",
      },
    ])
  );
  $props.set(
    toMap([
      {
        id: "prop1",
        name: "data",
        instanceId: "list",
        type: "json",
        value: ["orange", "apple", "banana"],
      },
      {
        id: "prop2",
        name: "item",
        instanceId: "list",
        type: "parameter",
        value: "itemId",
      },
      {
        id: "prop3",
        name: "ariaLabel",
        instanceId: "item",
        type: "expression",
        value: `$ws$dataSource$itemId`,
      },
    ])
  );
  expect($propValuesByInstanceSelector.get()).toEqual(
    new Map([
      [
        JSON.stringify(["list"]),
        new Map<string, unknown>([["data", ["orange", "apple", "banana"]]]),
      ],
      [
        JSON.stringify(["item", "list[0]", "list"]),
        new Map<string, unknown>([["ariaLabel", "orange"]]),
      ],
      [
        JSON.stringify(["item", "list[1]", "list"]),
        new Map<string, unknown>([["ariaLabel", "apple"]]),
      ],
      [
        JSON.stringify(["item", "list[2]", "list"]),
        new Map<string, unknown>([["ariaLabel", "banana"]]),
      ],
    ])
  );

  cleanStores($propValuesByInstanceSelector);
});

test("access parameter value from variables values", () => {
  $instances.set(
    toMap([
      {
        id: "body",
        type: "instance",
        component: "Body",
        children: [],
      },
    ])
  );
  selectPageRoot("body");
  $dataSources.set(
    toMap([
      {
        id: "parameterId",
        scopeInstanceId: "body",
        type: "parameter",
        name: "paramName",
      },
    ])
  );
  $dataSourceVariables.set(new Map([["parameterId", "paramValue"]]));
  $props.set(
    toMap([
      {
        id: "parameterPropId",
        name: "param",
        instanceId: "body",
        type: "expression",
        value: "$ws$dataSource$parameterId",
      },
    ])
  );
  expect($propValuesByInstanceSelector.get()).toEqual(
    new Map([
      [
        JSON.stringify(["body"]),
        new Map<string, unknown>([["param", "paramValue"]]),
      ],
    ])
  );

  cleanStores($propValuesByInstanceSelector);
});

test("compute props bound to resource variables", () => {
  $instances.set(
    toMap([{ id: "body", type: "instance", component: "Body", children: [] }])
  );
  selectPageRoot("body");
  $dataSources.set(
    toMap([
      {
        id: "resourceVariableId",
        scopeInstanceId: "body",
        type: "resource",
        name: "paramName",
        resourceId: "resourceId",
      },
    ])
  );
  $resourceValues.set(new Map([["resourceId", "my-value"]]));
  $props.set(
    toMap([
      {
        id: "resourcePropId",
        name: "resource",
        instanceId: "body",
        type: "expression",
        value: "$ws$dataSource$resourceVariableId",
      },
    ])
  );
  expect($propValuesByInstanceSelector.get()).toEqual(
    new Map([
      [
        JSON.stringify(["body"]),
        new Map<string, unknown>([["resource", "my-value"]]),
      ],
    ])
  );

  cleanStores($propValuesByInstanceSelector);
});

test("compute instance text content when plain text", () => {
  $instances.set(
    toMap([
      {
        id: "body",
        type: "instance",
        component: "Body",
        children: [
          { type: "id", value: "plainBox" },
          { type: "id", value: "richBox" },
        ],
      },
      {
        id: "plainBox",
        type: "instance",
        component: "Box",
        children: [{ type: "text", value: "plain" }],
      },
      {
        id: "richBox",
        type: "instance",
        component: "Box",
        children: [
          { type: "text", value: "plain" },
          { type: "id", value: "bold" },
        ],
      },
      {
        id: "bold",
        type: "instance",
        component: "Bold",
        children: [{ type: "text", value: "bold" }],
      },
    ])
  );
  selectPageRoot("body");
  expect($propValuesByInstanceSelector.get()).toEqual(
    new Map([
      [JSON.stringify(["body"]), new Map<string, unknown>()],
      [
        JSON.stringify(["plainBox", "body"]),
        new Map<string, unknown>([[textContentAttribute, "plain"]]),
      ],
      [JSON.stringify(["richBox", "body"]), new Map<string, unknown>()],
      [
        JSON.stringify(["bold", "richBox", "body"]),
        new Map<string, unknown>([[textContentAttribute, "bold"]]),
      ],
    ])
  );

  cleanStores($propValuesByInstanceSelector);
});

test("compute instance text content bound to expression", () => {
  $instances.set(
    toMap([
      {
        id: "body",
        type: "instance",
        component: "Body",
        children: [{ type: "id", value: "expressionBox" }],
      },
      {
        id: "expressionBox",
        type: "instance",
        component: "Box",
        children: [
          { type: "expression", value: `"Hello " + $ws$dataSource$world` },
        ],
      },
    ])
  );
  $dataSources.set(
    toMap([
      {
        id: "world",
        scopeInstanceId: "body",
        name: "world",
        type: "variable",
        value: { type: "string", value: "world" },
      },
    ])
  );
  selectPageRoot("body");
  expect($propValuesByInstanceSelector.get()).toEqual(
    new Map([
      [JSON.stringify(["body"]), new Map<string, unknown>()],
      [
        JSON.stringify(["expressionBox", "body"]),
        new Map<string, unknown>([[textContentAttribute, "Hello world"]]),
      ],
    ])
  );

  cleanStores($propValuesByInstanceSelector);
});

test("use default system values in props", () => {
  $instances.set(
    toMap([
      {
        id: "body",
        type: "instance",
        component: "Body",
        children: [],
      },
    ])
  );
  $dataSources.set(
    toMap([
      {
        id: "systemId",
        scopeInstanceId: "body",
        name: "system",
        type: "parameter",
      },
    ])
  );
  $props.set(
    toMap([
      {
        id: "1",
        instanceId: "body",
        name: "data-origin",
        type: "expression",
        value: `$ws$dataSource$systemId.origin`,
      },
    ])
  );
  selectPageRoot("body");
  expect($propValuesByInstanceSelector.get()).toEqual(
    new Map([
      [
        JSON.stringify(["body"]),
        new Map<string, unknown>([
          ["data-origin", "https://undefined.wstd.work"],
        ]),
      ],
    ])
  );

  cleanStores($propValuesByInstanceSelector);
});

test("compute props with global variables", () => {
  const rootVariable = new Variable("rootVariable", "root value");
  const data = renderData(
    <ws.root ws:id={ROOT_INSTANCE_ID} vars={expression`${rootVariable}`}>
      <$.Body ws:id="bodyId">
        <$.Box ws:id="boxId" data-value={expression`${rootVariable}`}></$.Box>
      </$.Body>
    </ws.root>
  );
  data.instances.delete(ROOT_INSTANCE_ID);
  $instances.set(data.instances);
  $dataSources.set(data.dataSources);
  $props.set(data.props);
  selectPageRoot("bodyId");
  expect($propValuesByInstanceSelector.get()).toEqual(
    new Map([
      [JSON.stringify(["bodyId"]), new Map<string, unknown>()],
      [
        JSON.stringify(["boxId", "bodyId"]),
        new Map<string, unknown>([["data-value", "root value"]]),
      ],
    ])
  );
});

test("compute variable values for root", () => {
  const bodyVariable = new Variable("bodyVariable", "initial");
  const data = renderData(
    <$.Body ws:id="bodyId" vars={expression`${bodyVariable}`}></$.Body>
  );
  $instances.set(data.instances);
  $dataSources.set(data.dataSources);
  $props.set(data.props);
  const [dataSourceId] = data.dataSources.keys();
  selectPageRoot("bodyId");
  $dataSourceVariables.set(new Map([[dataSourceId, "success"]]));
  expect($variableValuesByInstanceSelector.get()).toEqual(
    new Map([
      [JSON.stringify([ROOT_INSTANCE_ID]), new Map()],
      [
        JSON.stringify(["bodyId", ROOT_INSTANCE_ID]),
        new Map<string, unknown>([[dataSourceId, "success"]]),
      ],
    ])
  );
});

test("nest variable values from root to current instance", () => {
  const bodyVariable = new Variable("bodyVariable", "");
  const boxVariable = new Variable("boxVariable", "");
  const textVariable = new Variable("textVariable", "");
  const data = renderData(
    <$.Body ws:id="bodyId" vars={expression`${bodyVariable}`}>
      <$.Box ws:id="boxId" ars={expression`${boxVariable}`}></$.Box>
      <$.Text ws:id="textId" ars={expression`${textVariable}`}></$.Text>
    </$.Body>
  );
  $instances.set(data.instances);
  $dataSources.set(data.dataSources);
  $props.set(data.props);
  const [bodyVariableId, boxVariableId, textVariableId] =
    data.dataSources.keys();
  selectPageRoot("bodyId");
  $dataSourceVariables.set(
    new Map([
      [bodyVariableId, "bodyValue"],
      [boxVariableId, "boxValue"],
      [textVariableId, "textValue"],
    ])
  );
  expect($variableValuesByInstanceSelector.get()).toEqual(
    new Map([
      [JSON.stringify([ROOT_INSTANCE_ID]), new Map()],
      [
        JSON.stringify(["bodyId", ROOT_INSTANCE_ID]),
        new Map<string, unknown>([[bodyVariableId, "bodyValue"]]),
      ],
      [
        JSON.stringify(["boxId", "bodyId", ROOT_INSTANCE_ID]),
        new Map<string, unknown>([
          [bodyVariableId, "bodyValue"],
          [boxVariableId, "boxValue"],
        ]),
      ],
      [
        JSON.stringify(["textId", "bodyId", ROOT_INSTANCE_ID]),
        new Map<string, unknown>([
          [bodyVariableId, "bodyValue"],
          [textVariableId, "textValue"],
        ]),
      ],
    ])
  );
});

test("compute item values for collection", () => {
  const dataVariable = new Variable("dataVariable", [
    "apple",
    "banana",
    "orange",
  ]);
  const collectionItem = new Parameter("Collection Item");
  const data = renderData(
    <$.Body ws:id="bodyId">
      <ws.collection
        ws:id="collectionId"
        data={expression`${dataVariable}`}
        item={collectionItem}
      >
        <$.Box ws:id="boxId"></$.Box>
      </ws.collection>
    </$.Body>
  );
  $instances.set(data.instances);
  $dataSources.set(data.dataSources);
  $props.set(data.props);
  const [dataVariableId, itemParameterId] = data.dataSources.keys();
  selectPageRoot("bodyId");
  $dataSourceVariables.set(new Map([]));
  expect($variableValuesByInstanceSelector.get()).toEqual(
    new Map([
      [JSON.stringify([ROOT_INSTANCE_ID]), new Map()],
      [JSON.stringify(["bodyId", ROOT_INSTANCE_ID]), new Map()],
      [
        JSON.stringify([
          "boxId",
          "collectionId[0]",
          "collectionId",
          "bodyId",
          ROOT_INSTANCE_ID,
        ]),
        new Map<string, unknown>([
          [dataVariableId, ["apple", "banana", "orange"]],
          [itemParameterId, "apple"],
        ]),
      ],
      [
        JSON.stringify([
          "boxId",
          "collectionId[1]",
          "collectionId",
          "bodyId",
          ROOT_INSTANCE_ID,
        ]),
        new Map<string, unknown>([
          [dataVariableId, ["apple", "banana", "orange"]],
          [itemParameterId, "banana"],
        ]),
      ],
      [
        JSON.stringify([
          "boxId",
          "collectionId[2]",
          "collectionId",
          "bodyId",
          ROOT_INSTANCE_ID,
        ]),
        new Map<string, unknown>([
          [dataVariableId, ["apple", "banana", "orange"]],
          [itemParameterId, "orange"],
        ]),
      ],
      [
        JSON.stringify(["collectionId", "bodyId", ROOT_INSTANCE_ID]),
        new Map<string, unknown>([
          [dataVariableId, ["apple", "banana", "orange"]],
        ]),
      ],
    ])
  );
});

test("compute resource variable values", () => {
  const resourceVariable = new ResourceValue("resourceVariable", {
    url: expression`""`,
    method: "get",
    headers: [],
  });
  const data = renderData(
    <$.Body ws:id="bodyId" vars={expression`${resourceVariable}`}></$.Body>
  );
  $instances.set(data.instances);
  $dataSources.set(data.dataSources);
  $props.set(data.props);
  const [resourceVariableId] = data.dataSources.keys();
  const [resourceId] = data.resources.keys();
  selectPageRoot("bodyId");
  $resourceValues.set(new Map([[resourceId, "my-value"]]));
  expect($variableValuesByInstanceSelector.get()).toEqual(
    new Map([
      [JSON.stringify([ROOT_INSTANCE_ID]), new Map()],
      [
        JSON.stringify(["bodyId", ROOT_INSTANCE_ID]),
        new Map<string, unknown>([[resourceVariableId, "my-value"]]),
      ],
    ])
  );
});

test("stop variables lookup outside of slots", () => {
  const bodyVariable = new Variable("bodyVariable", "body");
  const slotVariable = new Variable("slotVariable", "slot");
  const boxVariable = new Variable("boxVariable", "box");
  const data = renderData(
    <$.Body ws:id="bodyId" vars={expression`${bodyVariable}`}>
      <$.Slot ws:id="slotId" vars={expression`${slotVariable}`}>
        <$.Fragment ws:id="fragmentId">
          <$.Box ws:id="boxId" vars={expression`${boxVariable}`}></$.Box>
        </$.Fragment>
      </$.Slot>
    </$.Body>
  );
  $instances.set(data.instances);
  $dataSources.set(data.dataSources);
  $props.set(data.props);
  const [bodyVariableId, slotVariableId, boxVariableId] =
    data.dataSources.keys();
  selectPageRoot("bodyId");
  expect($variableValuesByInstanceSelector.get()).toEqual(
    new Map([
      [JSON.stringify([ROOT_INSTANCE_ID]), new Map()],
      [
        JSON.stringify(["bodyId", ROOT_INSTANCE_ID]),
        new Map<string, unknown>([[bodyVariableId, "body"]]),
      ],
      [
        JSON.stringify(["slotId", "bodyId", ROOT_INSTANCE_ID]),
        new Map<string, unknown>([
          [bodyVariableId, "body"],
          [slotVariableId, "slot"],
        ]),
      ],
      [
        JSON.stringify(["fragmentId", "slotId", "bodyId", ROOT_INSTANCE_ID]),
        new Map<string, unknown>(),
      ],
      [
        JSON.stringify([
          "boxId",
          "fragmentId",
          "slotId",
          "bodyId",
          ROOT_INSTANCE_ID,
        ]),
        new Map<string, unknown>([[boxVariableId, "box"]]),
      ],
    ])
  );
});

test("compute parameter and resource variables without values to make it available in scope", () => {
  const resourceVariable = new ResourceValue("resourceVariable", {
    url: expression`""`,
    method: "get",
    headers: [],
  });
  const parameterVariable = new Parameter("parameterVariable");
  const data = renderData(
    <$.Body
      ws:id="bodyId"
      vars={expression`${resourceVariable} + ${parameterVariable}`}
    ></$.Body>
  );
  $instances.set(data.instances);
  $dataSources.set(data.dataSources);
  $props.set(data.props);
  const [resourceVariableId, parameterVariableId] = data.dataSources.keys();
  selectPageRoot("bodyId");
  expect($variableValuesByInstanceSelector.get()).toEqual(
    new Map([
      [JSON.stringify([ROOT_INSTANCE_ID]), new Map()],
      [
        JSON.stringify(["bodyId", ROOT_INSTANCE_ID]),
        new Map<string, unknown>([
          [resourceVariableId, undefined],
          [parameterVariableId, undefined],
        ]),
      ],
    ])
  );
});

test("prefill default system variable value", () => {
  const system = new Parameter("system");
  const data = renderData(
    <$.Body ws:id="bodyId" vars={expression`${system}`}></$.Body>
  );
  $instances.set(data.instances);
  $dataSources.set(data.dataSources);
  $props.set(data.props);
  const [systemId] = data.dataSources.keys();
  selectPageRoot("bodyId", systemId);
  expect($variableValuesByInstanceSelector.get()).toEqual(
    new Map([
      [JSON.stringify([ROOT_INSTANCE_ID]), new Map()],
      [
        JSON.stringify(["bodyId", ROOT_INSTANCE_ID]),
        new Map<string, unknown>([
          [
            systemId,
            { params: {}, search: {}, origin: "https://undefined.wstd.work" },
          ],
        ]),
      ],
    ])
  );
  updateCurrentSystem({
    params: { slug: "my-post" },
  });
  expect($variableValuesByInstanceSelector.get()).toEqual(
    new Map([
      [JSON.stringify([ROOT_INSTANCE_ID]), new Map()],
      [
        JSON.stringify(["bodyId", ROOT_INSTANCE_ID]),
        new Map<string, unknown>([
          [
            systemId,
            {
              params: { slug: "my-post" },
              search: {},
              origin: "https://undefined.wstd.work",
            },
          ],
        ]),
      ],
    ])
  );
});

test("mask variables with the same name in nested scope", () => {
  const bodyVariable = new Variable("myVariable", "body");
  const boxVariable = new Variable("myVariable", "box");
  const data = renderData(
    <$.Body ws:id="bodyId" vars={expression`${bodyVariable}`}>
      <$.Box ws:id="boxId" vars={expression`${boxVariable}`}></$.Box>
    </$.Body>
  );
  $instances.set(data.instances);
  $dataSources.set(data.dataSources);
  $props.set(data.props);
  const [bodyVariableId, boxVariableId] = data.dataSources.keys();
  selectPageRoot("bodyId");
  expect($variableValuesByInstanceSelector.get()).toEqual(
    new Map([
      [JSON.stringify([ROOT_INSTANCE_ID]), new Map()],
      [
        JSON.stringify(["bodyId", ROOT_INSTANCE_ID]),
        new Map<string, unknown>([[bodyVariableId, "body"]]),
      ],
      [
        JSON.stringify(["boxId", "bodyId", ROOT_INSTANCE_ID]),
        new Map<string, unknown>([[boxVariableId, "box"]]),
      ],
    ])
  );
});

test("inherit variables from global root", () => {
  const rootVariable = new Variable("rootVariable", "root");
  const boxVariable = new Variable("myVariable", "box");
  const data = renderData(
    <ws.root ws:id={ROOT_INSTANCE_ID} vars={expression`${rootVariable}`}>
      <$.Body ws:id="bodyId">
        <$.Box ws:id="boxId" vars={expression`${boxVariable}`}></$.Box>
      </$.Body>
    </ws.root>
  );
  data.instances.delete(ROOT_INSTANCE_ID);
  $instances.set(data.instances);
  $dataSources.set(data.dataSources);
  $props.set(data.props);
  const [rootVariableId, boxVariableId] = data.dataSources.keys();
  selectPageRoot("bodyId");
  expect($variableValuesByInstanceSelector.get()).toEqual(
    new Map([
      [
        JSON.stringify([ROOT_INSTANCE_ID]),
        new Map<string, unknown>([[rootVariableId, "root"]]),
      ],
      [
        JSON.stringify(["bodyId", ROOT_INSTANCE_ID]),
        new Map<string, unknown>([[rootVariableId, "root"]]),
      ],
      [
        JSON.stringify(["boxId", "bodyId", ROOT_INSTANCE_ID]),
        new Map<string, unknown>([
          [rootVariableId, "root"],
          [boxVariableId, "box"],
        ]),
      ],
    ])
  );
});

test("inherit variables from global root inside slots", () => {
  const rootVariable = new Variable("rootVariable", "root");
  const bodyVariable = new Variable("bodyVariable", "body");
  const boxVariable = new Variable("myVariable", "box");
  const data = renderData(
    <ws.root ws:id={ROOT_INSTANCE_ID} vars={expression`${rootVariable}`}>
      <$.Body ws:id="bodyId" vars={expression`${bodyVariable}`}>
        <$.Slot ws:id="slotId">
          <$.Fragment ws:id="fragmentId">
            <$.Box ws:id="boxId" vars={expression`${boxVariable}`}></$.Box>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    </ws.root>
  );
  data.instances.delete(ROOT_INSTANCE_ID);
  $instances.set(data.instances);
  $dataSources.set(data.dataSources);
  $props.set(data.props);
  const [rootVariableId, _bodyVariableId, boxVariableId] =
    data.dataSources.keys();
  selectPageRoot("bodyId");
  expect(
    $variableValuesByInstanceSelector
      .get()
      .get(
        getInstanceKey([
          "boxId",
          "fragmentId",
          "slotId",
          "bodyId",
          ROOT_INSTANCE_ID,
        ])
      )
  ).toEqual(
    new Map<string, unknown>([
      [rootVariableId, "root"],
      [boxVariableId, "box"],
    ])
  );
});
