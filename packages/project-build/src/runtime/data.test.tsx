import { describe, expect, test, vi } from "vitest";
import {
  $,
  ActionValue,
  expression,
  Parameter,
  renderData,
  ResourceValue,
  Variable,
  ws,
} from "@webstudio-is/template";
import {
  encodeDataVariableId,
  getAllPages,
  getHomePage,
  ROOT_INSTANCE_ID,
  SYSTEM_VARIABLE_ID,
  type DataSource,
  type Instance,
  type Prop,
  type Resource,
} from "@webstudio-is/sdk";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  computeExpression,
  createDataVariableCreatePayload,
  createDataVariableDeletePayload,
  createDataVariableUpdatePayload,
  createResourceCreatePayload,
  createResourceDeletePayload,
  createResourceUpdatePayload,
  createResourceUpsertPatchPayload,
  createResourceValue,
  decodeDataVariableName,
  deleteVariableMutable,
  encodeDataVariableName,
  findAvailableVariables,
  findResource,
  findUnsetVariableNames,
  findVariableUsagesByInstance,
  getResourceExpressionErrors,
  rebindTreeVariablesMutable,
  replaceDataSourcesInExpression,
  restoreExpressionVariables,
  resourceFieldsInput,
  resourceFieldsUpdateInput,
  serializeDataVariables,
  serializeResources,
  unsetExpressionVariables,
  upsertResourceMutable,
  validateDataVariableNameWithSources,
} from "./data";

test("encode data variable name when necessary", () => {
  expect(encodeDataVariableName("formState")).toEqual("formState");
  expect(encodeDataVariableName("Collection Item")).toEqual(
    "Collection$32$Item"
  );
  expect(encodeDataVariableName("$my$Variable")).toEqual("$36$my$36$Variable");
});

test("dencode data variable name", () => {
  expect(decodeDataVariableName(encodeDataVariableName("formState"))).toEqual(
    "formState"
  );
  expect(
    decodeDataVariableName(encodeDataVariableName("Collection Item"))
  ).toEqual("Collection Item");
});

test("validate data variable name", () => {
  const dataSources = [
    {
      id: "variable-1",
      scopeInstanceId: "instance-1",
      name: "existingVariable",
      type: "variable",
      value: { type: "string", value: "" },
    },
    {
      id: "resource-1",
      scopeInstanceId: "instance-1",
      name: "existingResource",
      type: "resource",
      resourceId: "resource-value-1",
    },
  ] as const;

  expect(
    validateDataVariableNameWithSources({
      dataSources,
      name: "",
      scopeInstanceId: "instance-1",
    })
  ).toEqual({
    type: "required",
    message: "Variable name is required",
  });
  expect(
    validateDataVariableNameWithSources({
      dataSources,
      name: "existingVariable",
      scopeInstanceId: "instance-1",
    })
  ).toEqual({
    type: "duplicate",
    message: "Name is already used by another variable on this instance",
  });
  expect(
    validateDataVariableNameWithSources({
      dataSources,
      name: "existingVariable",
      scopeInstanceId: "instance-2",
    })
  ).toBeUndefined();
  expect(
    validateDataVariableNameWithSources({
      dataSources,
      name: "existingResource",
      scopeInstanceId: "instance-1",
    })
  ).toBeUndefined();
});

test("serialize data variables filters by scope", () => {
  const dataSources = [
    {
      id: "variable-1",
      scopeInstanceId: "box-1",
      name: "title",
      type: "variable",
      value: { type: "string", value: "Hello" },
    },
    {
      id: "variable-2",
      scopeInstanceId: "box-2",
      name: "count",
      type: "variable",
      value: { type: "number", value: 1 },
    },
    {
      id: "resource-1",
      scopeInstanceId: "box-1",
      name: "users",
      type: "resource",
      resourceId: "resource-value-1",
    },
  ] as const;

  expect(serializeDataVariables({ dataSources })).toEqual({
    variables: [
      {
        id: "variable-1",
        name: "title",
        scopeInstanceId: "box-1",
        value: { type: "string", value: "Hello" },
      },
      {
        id: "variable-2",
        name: "count",
        scopeInstanceId: "box-2",
        value: { type: "number", value: 1 },
      },
    ],
  });
  expect(
    serializeDataVariables({ dataSources, scopeInstanceId: "box-1" })
  ).toEqual({
    variables: [
      {
        id: "variable-1",
        name: "title",
        scopeInstanceId: "box-1",
        value: { type: "string", value: "Hello" },
      },
    ],
  });
});

test("create data variable payload validates ids and names", () => {
  expect(
    createDataVariableCreatePayload({
      dataSourceId: "variable-2",
      scopeInstanceId: "instance-1",
      name: "newVariable",
      value: { type: "string", value: "hello" },
      dataSources: [
        {
          id: "variable-1",
          scopeInstanceId: "instance-1",
          name: "existingVariable",
          type: "variable",
          value: { type: "string", value: "" },
        },
      ],
    })
  ).toEqual({
    errors: [],
    payload: [
      {
        namespace: "dataSources",
        patches: [
          {
            op: "add",
            path: ["variable-2"],
            value: {
              id: "variable-2",
              scopeInstanceId: "instance-1",
              name: "newVariable",
              type: "variable",
              value: { type: "string", value: "hello" },
            },
          },
        ],
      },
    ],
  });

  expect(
    createDataVariableCreatePayload({
      dataSourceId: "variable-1",
      scopeInstanceId: "instance-1",
      name: "existingVariable",
      value: { type: "string", value: "" },
      dataSources: [
        {
          id: "variable-1",
          scopeInstanceId: "instance-1",
          name: "existingVariable",
          type: "variable",
          value: { type: "string", value: "" },
        },
      ],
    }).errors
  ).toEqual([{ type: "duplicate-id", dataSourceId: "variable-1" }]);
});

test("update data variable payload validates renamed variables", () => {
  const variable = {
    id: "variable-1",
    scopeInstanceId: "instance-1",
    name: "oldName",
    type: "variable",
    value: { type: "string", value: "" },
  } as const;

  expect(
    createDataVariableUpdatePayload({
      variable,
      values: {
        name: "newName",
        value: { type: "number", value: 1 },
      },
      dataSources: [variable],
    })
  ).toEqual({
    payload: [
      {
        namespace: "dataSources",
        patches: [
          { op: "replace", path: ["variable-1", "name"], value: "newName" },
          {
            op: "replace",
            path: ["variable-1", "value"],
            value: { type: "number", value: 1 },
          },
        ],
      },
    ],
  });

  expect(
    createDataVariableUpdatePayload({
      variable,
      values: { name: "duplicateName" },
      dataSources: [
        variable,
        {
          id: "variable-2",
          scopeInstanceId: "instance-1",
          name: "duplicateName",
          type: "variable",
          value: { type: "string", value: "" },
        },
      ],
    }).error
  ).toEqual({
    type: "duplicate",
    message: "Name is already used by another variable on this instance",
  });
});

test("dencode data variable name with dollar sign", () => {
  expect(
    decodeDataVariableName(encodeDataVariableName("$my$Variable"))
  ).toEqual("$my$Variable");
  expect(decodeDataVariableName("$my$Variable")).toEqual("$my$Variable");
});

test("find available variables", () => {
  const bodyVariable = new Variable("bodyVariable", "");
  const boxVariable = new Variable("boxVariable", "");
  const data = renderData(
    <$.Body ws:id="bodyId" vars={expression`${bodyVariable}`}>
      <$.Box ws:id="boxId" vars={expression`${boxVariable}`}></$.Box>
    </$.Body>
  );
  expect(
    findAvailableVariables({ ...data, startingInstanceId: "boxId" })
  ).toEqual([
    expect.objectContaining({ name: "system", id: SYSTEM_VARIABLE_ID }),
    expect.objectContaining({ name: "bodyVariable" }),
    expect.objectContaining({ name: "boxVariable" }),
  ]);
});

test("find masked variables", () => {
  const bodyVariable = new Variable("myVariable", "");
  const boxVariable = new Variable("myVariable", "");
  const data = renderData(
    <$.Body ws:id="bodyId" vars={expression`${bodyVariable}`}>
      <$.Box ws:id="boxId" vars={expression`${boxVariable}`}></$.Box>
    </$.Body>
  );
  expect(
    findAvailableVariables({ ...data, startingInstanceId: "boxId" })
  ).toEqual([
    expect.objectContaining({ name: "system", id: SYSTEM_VARIABLE_ID }),
    expect.objectContaining({ scopeInstanceId: "boxId", name: "myVariable" }),
  ]);
});

test("find global variables", () => {
  const globalVariable = new Variable("globalVariable", "");
  const boxVariable = new Variable("boxVariable", "");
  const data = renderData(
    <ws.root ws:id={ROOT_INSTANCE_ID} vars={expression`${globalVariable}`}>
      <$.Body ws:id="bodyId">
        <$.Box ws:id="boxId" vars={expression`${boxVariable}`}></$.Box>
      </$.Body>
    </ws.root>
  );
  data.instances.delete(ROOT_INSTANCE_ID);
  expect(
    findAvailableVariables({ ...data, startingInstanceId: "boxId" })
  ).toEqual([
    expect.objectContaining({ name: "system", id: SYSTEM_VARIABLE_ID }),
    expect.objectContaining({ name: "globalVariable" }),
    expect.objectContaining({ name: "boxVariable" }),
  ]);
});

test("find global variables in slots", () => {
  const globalVariable = new Variable("globalVariable", "");
  const bodyVariable = new Variable("bodyVariable", "");
  const boxVariable = new Variable("boxVariable", "");
  const data = renderData(
    <ws.root ws:id={ROOT_INSTANCE_ID} vars={expression`${globalVariable}`}>
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
  expect(
    findAvailableVariables({ ...data, startingInstanceId: "boxId" })
  ).toEqual([
    expect.objectContaining({ name: "system", id: SYSTEM_VARIABLE_ID }),
    expect.objectContaining({ name: "globalVariable" }),
    expect.objectContaining({ name: "boxVariable" }),
  ]);
});

test("find legacy global variables with missing scope", () => {
  const data = renderData(
    <$.Body ws:id="bodyId">
      <$.Box ws:id="boxId"></$.Box>
    </$.Body>
  );
  data.dataSources.set("legacyGlobalVariableId", {
    id: "legacyGlobalVariableId",
    name: "legacyGlobalVariable",
    type: "variable",
    value: { type: "string", value: "" },
  });

  expect(
    findAvailableVariables({ ...data, startingInstanceId: "boxId" })
  ).toEqual([
    expect.objectContaining({ name: "system", id: SYSTEM_VARIABLE_ID }),
    expect.objectContaining({ name: "legacyGlobalVariable" }),
  ]);
});

test("unset expression variables", () => {
  expect(
    unsetExpressionVariables({
      expression: `$ws$dataSource$myId + arbitaryVariable`,
      unsetNameById: new Map([["myId", "My Variable"]]),
    })
  ).toEqual("My$32$Variable + arbitaryVariable");
});

test("ignore not existing variables in expressions", () => {
  expect(
    unsetExpressionVariables({
      expression: `$ws$dataSource$myId + arbitaryVariable`,
      unsetNameById: new Map(),
    })
  ).toEqual("$ws$dataSource$myId + arbitaryVariable");
});

test("restore expression variables", () => {
  expect(
    restoreExpressionVariables({
      expression: `My$32$Variable + missingVariable`,
      maskedIdByName: new Map([["My Variable", "myId"]]),
    })
  ).toEqual("$ws$dataSource$myId + missingVariable");
});

test("roundtrip system variable in assignment expression", () => {
  const expression = `system.origin = 123 ? 'test' : "bla"`;
  const restoredExpression = restoreExpressionVariables({
    expression,
    maskedIdByName: new Map([["system", SYSTEM_VARIABLE_ID]]),
  });

  expect(restoredExpression).toEqual(
    `$ws$system.origin = 123 ? 'test' : "bla"`
  );
  expect(
    unsetExpressionVariables({
      expression: restoredExpression,
      unsetNameById: new Map([[SYSTEM_VARIABLE_ID, "system"]]),
    })
  ).toEqual(expression);
});

test("replace data source ids in expression", () => {
  expect(
    replaceDataSourcesInExpression(
      `$ws$dataSource$oldId + missingVariable`,
      new Map([["oldId", "newId"]])
    )
  ).toEqual("$ws$dataSource$newId + missingVariable");
});

test("compute expression with decoded ids", () => {
  expect(
    computeExpression("$ws$dataSource$myId", new Map([["myId", "value"]]))
  ).toEqual("value");
});

test("compute expression with decoded names", () => {
  expect(
    computeExpression("My$32$Name", new Map([["My Name", "value"]]))
  ).toEqual("value");
});

test("compute expression when invalid syntax", () => {
  const spy = vi.spyOn(console, "error");
  expect(computeExpression("https://github.com", new Map())).toEqual(undefined);
  expect(spy).not.toHaveBeenCalled();
  spy.mockRestore();
});

test("compute expression with nested field of undefined without error", () => {
  const spy = vi.spyOn(console, "error");
  const variables = new Map([["myVariable", undefined]]);
  expect(computeExpression("myVariable.field", variables)).toEqual(undefined);
  expect(spy).not.toHaveBeenCalled();
  spy.mockRestore();
});

test("compute literal expression when variable is json object", () => {
  const jsonObject = { hello: "world", subObject: { world: "hello" } };
  const variables = new Map([["jsonVariable", jsonObject]]);
  expect(computeExpression("`${jsonVariable}`", variables)).toEqual(
    `{"hello":"world","subObject":{"world":"hello"}}`
  );
  expect(computeExpression("`${jsonVariable.subObject}`", variables)).toEqual(
    `{"world":"hello"}`
  );
});

test("compute literal expression when object is frozen", () => {
  const jsonObject = Object.freeze({
    hello: "world",
    subObject: { world: "hello" },
  });
  const variables = new Map([["jsonVariable", jsonObject]]);
  expect(computeExpression("`${jsonVariable.subObject}`", variables)).toEqual(
    `{"world":"hello"}`
  );
});

test("compute expression does not clone unused variables", () => {
  const variables = new Map<string, unknown>([
    ["usedVariable", 1],
    ["unusedVariable", Object.freeze({ callback: () => undefined })],
  ]);
  expect(computeExpression("usedVariable + 1", variables)).toEqual(2);
});

test("compute expression cache reads current variables", () => {
  expect(
    computeExpression("cachedVariable", new Map([["cachedVariable", "first"]]))
  ).toEqual("first");
  expect(
    computeExpression("cachedVariable", new Map([["cachedVariable", "second"]]))
  ).toEqual("second");
});

test("compute unset variables as undefined", () => {
  expect(computeExpression(`a`, new Map())).toEqual(undefined);
  expect(computeExpression("`${a}`", new Map())).toEqual("undefined");
});

test("find unset variable names", () => {
  const resourceVariable = new ResourceValue("resourceVariable", {
    url: expression`six`,
    method: "post",
    searchParams: [{ name: "filter", value: expression`seven` }],
    headers: [{ name: "auth", value: expression`eight` }],
    body: expression`nine`,
  });
  const resourceProp = new ResourceValue("resourceProp", {
    url: expression`ten`,
    method: "post",
    searchParams: [{ name: "filter", value: expression`eleven` }],
    headers: [{ name: "auth", value: expression`twelve` }],
    body: expression`thirteen`,
  });
  const data = renderData(
    <$.Body ws:id="body" data-prop={expression`two`}>
      <$.Box ws:id="box" data-prop={expression`three`}>
        <$.Text
          ws:id="text"
          data-variables={expression`${resourceVariable}`}
          data-resource={resourceProp}
          data-action={new ActionValue(["five"], expression`four + five`)}
        >{expression`one`}</$.Text>
      </$.Box>
    </$.Body>
  );
  expect(
    findUnsetVariableNames({ startingInstanceId: "body", ...data })
  ).toEqual([
    "one",
    "two",
    "three",
    "four",
    "six",
    "eight",
    "seven",
    "nine",
    "ten",
    "twelve",
    "eleven",
    "thirteen",
  ]);
});

test("restore tree variables in children", () => {
  const bodyVariable = new Variable("one", "one value of body");
  const boxVariable = new Variable("one", "one value of box");
  const data = renderData(
    <$.Body ws:id="bodyId" data-vars={expression`${bodyVariable}`}>
      <$.Box ws:id="boxId" data-vars={expression`${boxVariable}`}>
        <$.Text ws:id="textId">{expression`one`}</$.Text>
      </$.Box>
    </$.Body>
  );
  rebindTreeVariablesMutable({
    startingInstanceId: "boxId",
    pages: createDefaultPages({ rootInstanceId: "bodyId" }),
    ...data,
  });
  expect(Array.from(data.dataSources.values())).toEqual([
    expect.objectContaining({ scopeInstanceId: "bodyId" }),
    expect.objectContaining({ scopeInstanceId: "boxId" }),
  ]);
  const [_bodyVariableId, boxVariableId] = data.dataSources.keys();
  const boxIdentifier = encodeDataVariableId(boxVariableId);
  expect(data.instances.get("textId")?.children).toEqual([
    { type: "expression", value: boxIdentifier },
  ]);
});

test("restore tree variables in props", () => {
  const oneBody = new Variable("one", "one value of body");
  const oneBox = new Variable("one", "one value of box");
  const twoBox = new Variable("two", "two value of box");
  const data = renderData(
    <$.Body ws:id="bodyId" data-body-vars={expression`${oneBody}`}>
      <$.Box
        ws:id="boxId"
        data-box-vars={expression`${oneBox} ${twoBox}`}
        data-one={expression`one`}
        data-action={new ActionValue(["one"], expression`one + two + three`)}
      >
        <$.Text ws:id="text" data-two={expression`one + two + three`}></$.Text>
      </$.Box>
    </$.Body>
  );
  rebindTreeVariablesMutable({
    startingInstanceId: "boxId",
    pages: createDefaultPages({ rootInstanceId: "bodyId" }),
    ...data,
  });
  const [_bodyVariableId, boxOneVariableId, boxTwoVariableId] =
    data.dataSources.keys();
  const boxOneIdentifier = encodeDataVariableId(boxOneVariableId);
  const boxTwoIdentifier = encodeDataVariableId(boxTwoVariableId);
  expect(Array.from(data.dataSources.values())).toEqual([
    expect.objectContaining({ name: "one", scopeInstanceId: "bodyId" }),
    expect.objectContaining({ name: "one", scopeInstanceId: "boxId" }),
    expect.objectContaining({ name: "two", scopeInstanceId: "boxId" }),
  ]);
  expect(Array.from(data.props.values())).toEqual([
    expect.objectContaining({ name: "data-body-vars" }),
    expect.objectContaining({ name: "data-box-vars" }),
    expect.objectContaining({ name: "data-one", value: boxOneIdentifier }),
    expect.objectContaining({
      name: "data-action",
      value: [
        {
          type: "execute",
          args: ["one"],
          code: `one + ${boxTwoIdentifier} + three`,
        },
      ],
    }),
    expect.objectContaining({
      name: "data-two",
      value: `${boxOneIdentifier} + ${boxTwoIdentifier} + three`,
    }),
  ]);
});

test("rebind tree variables in props and children", () => {
  const bodyVariable = new Variable("one", "one value of body");
  const boxVariable = new Variable("one", "one value of box");
  const data = renderData(
    <$.Body ws:id="bodyId" data-body-vars={expression`${bodyVariable}`}>
      <$.Box ws:id="boxId" data-box-vars={expression`${boxVariable}`}>
        <$.Text
          ws:id="textId"
          data-text-vars={expression`${bodyVariable}`}
          data-action={new ActionValue([], expression`${bodyVariable}`)}
        >
          {expression`${bodyVariable}`}
        </$.Text>
      </$.Box>
    </$.Body>
  );
  rebindTreeVariablesMutable({
    startingInstanceId: "boxId",
    pages: createDefaultPages({ rootInstanceId: "bodyId" }),
    ...data,
  });
  expect(Array.from(data.dataSources.values())).toEqual([
    expect.objectContaining({ scopeInstanceId: "bodyId" }),
    expect.objectContaining({ scopeInstanceId: "boxId" }),
  ]);
  const [_bodyVariableId, boxVariableId] = data.dataSources.keys();
  const boxIdentifier = encodeDataVariableId(boxVariableId);
  expect(Array.from(data.props.values())).toEqual([
    expect.objectContaining({ name: "data-body-vars" }),
    expect.objectContaining({ name: "data-box-vars", value: boxIdentifier }),
    expect.objectContaining({ name: "data-text-vars", value: boxIdentifier }),
    expect.objectContaining({
      name: "data-action",
      value: [{ type: "execute", args: [], code: boxIdentifier }],
    }),
  ]);
  expect(data.instances.get("textId")?.children).toEqual([
    { type: "expression", value: boxIdentifier },
  ]);
});

test("preserve nested variables with the same name when rebind", () => {
  const bodyVariable = new Variable("one", "one value of body");
  const textVariable = new Variable("one", "one value of box");
  const data = renderData(
    <$.Body ws:id="bodyId" data-body-vars={expression`${bodyVariable}`}>
      <$.Text ws:id="textId" data-text-vars={expression`${textVariable}`}>
        {expression`${textVariable}`}
      </$.Text>
    </$.Body>
  );
  rebindTreeVariablesMutable({
    startingInstanceId: "bodyId",
    pages: createDefaultPages({ rootInstanceId: "bodyId" }),
    ...data,
  });
  expect(Array.from(data.dataSources.values())).toEqual([
    expect.objectContaining({ scopeInstanceId: "bodyId" }),
    expect.objectContaining({ scopeInstanceId: "textId" }),
  ]);
  const [_bodyVariableId, textVariableId] = data.dataSources.keys();
  const textIdentifier = encodeDataVariableId(textVariableId);
  expect(data.instances.get("textId")?.children).toEqual([
    { type: "expression", value: textIdentifier },
  ]);
});

test("restore tree variables in resources", () => {
  const bodyVariable = new Variable("one", "one value of body");
  const boxVariable = new Variable("one", "one value of box");
  const resourceVariable = new ResourceValue("resourceVariable", {
    url: expression`one + 1`,
    method: "post",
    searchParams: [{ name: "filter", value: expression`one + 1` }],
    headers: [{ name: "auth", value: expression`one + 1` }],
    body: expression`one + 1`,
  });
  const resourceProp = new ResourceValue("resourceProp", {
    url: expression`one + 2`,
    method: "post",
    searchParams: [{ name: "filter", value: expression`one + 2` }],
    headers: [{ name: "auth", value: expression`one + 2` }],
    body: expression`one + 2`,
  });
  const data = renderData(
    <$.Body ws:id="bodyId" data-vars={expression`${bodyVariable}`}>
      <$.Box ws:id="boxId" data-vars={expression`${boxVariable}`}>
        <$.Text
          ws:id="text"
          data-vars={expression`${resourceVariable}`}
          data-resource={resourceProp}
        ></$.Text>
      </$.Box>
    </$.Body>
  );
  rebindTreeVariablesMutable({
    startingInstanceId: "boxId",
    pages: createDefaultPages({ rootInstanceId: "bodyId" }),
    ...data,
  });
  expect(Array.from(data.dataSources.values())).toEqual([
    expect.objectContaining({ scopeInstanceId: "bodyId" }),
    expect.objectContaining({ scopeInstanceId: "boxId" }),
    expect.objectContaining({ type: "resource" }),
  ]);
  const [_bodyVariableId, boxVariableId] = data.dataSources.keys();
  const boxIdentifier = encodeDataVariableId(boxVariableId);
  expect(Array.from(data.resources.values())).toEqual([
    expect.objectContaining({
      url: `${boxIdentifier} + 1`,
      method: "post",
      searchParams: [{ name: "filter", value: `${boxIdentifier} + 1` }],
      headers: [{ name: "auth", value: `${boxIdentifier} + 1` }],
      body: `${boxIdentifier} + 1`,
    }),
    expect.objectContaining({
      url: `${boxIdentifier} + 2`,
      method: "post",
      searchParams: [{ name: "filter", value: `${boxIdentifier} + 2` }],
      headers: [{ name: "auth", value: `${boxIdentifier} + 2` }],
      body: `${boxIdentifier} + 2`,
    }),
  ]);
});

test("rebind tree variables in resources", () => {
  const bodyVariable = new Variable("one", "one value of body");
  const boxVariable = new Variable("one", "one value of box");
  const resourceVariable = new ResourceValue("resourceVariable", {
    url: expression`${bodyVariable}`,
    method: "post",
    searchParams: [{ name: "filter", value: expression`${bodyVariable}` }],
    headers: [{ name: "auth", value: expression`${bodyVariable}` }],
    body: expression`${bodyVariable}`,
  });
  const resourceProp = new ResourceValue("resourceProp", {
    url: expression`${bodyVariable}`,
    method: "post",
    searchParams: [{ name: "filter", value: expression`${bodyVariable}` }],
    headers: [{ name: "auth", value: expression`${bodyVariable}` }],
    body: expression`${bodyVariable}`,
  });
  const data = renderData(
    <$.Body ws:id="bodyId" data-body-vars={expression`${bodyVariable}`}>
      <$.Box ws:id="boxId" data-box-vars={expression`${boxVariable}`}>
        <$.Text
          ws:id="textId"
          data-text-vars={expression`${resourceVariable}`}
          data-action={resourceProp}
        ></$.Text>
      </$.Box>
    </$.Body>
  );
  rebindTreeVariablesMutable({
    startingInstanceId: "boxId",
    pages: createDefaultPages({ rootInstanceId: "bodyId" }),
    ...data,
  });
  expect(Array.from(data.dataSources.values())).toEqual([
    expect.objectContaining({ scopeInstanceId: "bodyId" }),
    expect.objectContaining({ scopeInstanceId: "boxId" }),
    expect.objectContaining({ type: "resource" }),
  ]);
  const [_bodyVariableId, boxVariableId] = data.dataSources.keys();
  const boxIdentifier = encodeDataVariableId(boxVariableId);
  expect(Array.from(data.resources.values())).toEqual([
    expect.objectContaining({
      url: boxIdentifier,
      method: "post",
      searchParams: [{ name: "filter", value: boxIdentifier }],
      headers: [{ name: "auth", value: boxIdentifier }],
      body: boxIdentifier,
    }),
    expect.objectContaining({
      url: boxIdentifier,
      method: "post",
      searchParams: [{ name: "filter", value: boxIdentifier }],
      headers: [{ name: "auth", value: boxIdentifier }],
      body: boxIdentifier,
    }),
  ]);
});

test("rebind global variables in resources", () => {
  const globalVariable = new Variable("globalVariable", "");
  const data = renderData(
    <ws.root ws:id={ROOT_INSTANCE_ID} data-vars={expression`${globalVariable}`}>
      <$.Body ws:id="bodyId">
        <$.Text ws:id="textId">{expression`globalVariable`}</$.Text>
      </$.Body>
    </ws.root>
  );
  data.instances.delete(ROOT_INSTANCE_ID);
  rebindTreeVariablesMutable({
    startingInstanceId: ROOT_INSTANCE_ID,
    pages: createDefaultPages({ rootInstanceId: "bodyId" }),
    ...data,
  });
  expect(Array.from(data.dataSources.values())).toEqual([
    expect.objectContaining({ scopeInstanceId: ROOT_INSTANCE_ID }),
  ]);
  const [globalVariableId] = data.dataSources.keys();
  const globalIdentifier = encodeDataVariableId(globalVariableId);
  expect(data.instances.get("textId")?.children).toEqual([
    { type: "expression", value: globalIdentifier },
  ]);
});

test("preserve other variables when rebind", () => {
  const bodyVariable = new Variable("globalVariable", "");
  const textVariable = new Variable("textVariable", "");
  const data = renderData(
    <$.Body ws:id="bodyId" data-vars={expression`${bodyVariable}`}>
      <$.Text ws:id="textId">{expression`${textVariable}`}</$.Text>
    </$.Body>
  );
  rebindTreeVariablesMutable({
    startingInstanceId: "bodyId",
    pages: createDefaultPages({ rootInstanceId: "bodyId" }),
    ...data,
  });
  expect(Array.from(data.dataSources.values())).toEqual([
    expect.objectContaining({ scopeInstanceId: "bodyId" }),
    expect.objectContaining({ scopeInstanceId: "textId" }),
  ]);
  const [_globalVariableId, textVariableId] = data.dataSources.keys();
  const textIdentifier = encodeDataVariableId(textVariableId);
  expect(data.instances.get("textId")?.children).toEqual([
    { type: "expression", value: textIdentifier },
  ]);
});

test("prevent rebinding tree variables from slots", () => {
  const bodyVariable = new Variable("myVariable", "one value of body");
  const data = renderData(
    <$.Body ws:id="bodyId" data-body-vars={expression`${bodyVariable}`}>
      <$.Slot ws:id="slotId">
        <$.Fragment ws:id="fragmentId">
          <$.Box ws:id="boxId">{expression`myVariable`}</$.Box>
        </$.Fragment>
      </$.Slot>
    </$.Body>
  );
  rebindTreeVariablesMutable({
    startingInstanceId: "boxId",
    pages: createDefaultPages({ rootInstanceId: "bodyId" }),
    ...data,
  });
  expect(data.instances.get("boxId")?.children).toEqual([
    { type: "expression", value: "myVariable" },
  ]);
});

test("prevent rebinding with nested collection item", () => {
  const collectionItem = new Parameter("collectionITem");
  const nestedCollectionItem = new Parameter("collectionITem");
  const data = renderData(
    <$.Body ws:id="bodyId">
      <ws.collection ws:id="collectionId" data={[]} item={collectionItem}>
        <ws.collection
          ws:id="nestedCollectionId"
          data={expression`${collectionItem}`}
          item={nestedCollectionItem}
        >
          <ws.element ws:id="divId" ws:tag="div">
            {expression`${nestedCollectionItem}`}
          </ws.element>
        </ws.collection>
      </ws.collection>
    </$.Body>
  );
  expect(Array.from(data.dataSources.values())).toEqual([
    expect.objectContaining({ scopeInstanceId: "collectionId" }),
    expect.objectContaining({ scopeInstanceId: "nestedCollectionId" }),
  ]);
  const [collectionItemId, nestedCollectionItemId] = data.dataSources.keys();
  rebindTreeVariablesMutable({
    startingInstanceId: "bodyId",
    pages: createDefaultPages({ rootInstanceId: "bodyId" }),
    ...data,
  });
  expect(Array.from(data.props.values())).toEqual([
    expect.objectContaining({
      instanceId: "collectionId",
      name: "data",
    }),
    expect.objectContaining({
      instanceId: "collectionId",
      name: "item",
      value: collectionItemId,
    }),
    expect.objectContaining({
      instanceId: "nestedCollectionId",
      name: "data",
      value: encodeDataVariableId(collectionItemId),
    }),
    expect.objectContaining({
      instanceId: "nestedCollectionId",
      name: "item",
      value: nestedCollectionItemId,
    }),
  ]);
  expect(data.instances.get("divId")?.children).toEqual([
    { type: "expression", value: encodeDataVariableId(nestedCollectionItemId) },
  ]);
});

test("delete variable and unset it in expressions", () => {
  const bodyVariable = new Variable("bodyVariable", "one value of body");
  const data = renderData(
    <$.Body ws:id="bodyId" data-body-vars={expression`${bodyVariable}`}>
      <$.Box
        ws:id="boxId"
        data-action={new ActionValue([], expression`${bodyVariable}`)}
      >
        {expression`${bodyVariable}`}
      </$.Box>
    </$.Body>
  );
  expect(Array.from(data.dataSources.values())).toEqual([
    expect.objectContaining({ scopeInstanceId: "bodyId" }),
  ]);
  const [bodyVariableId] = data.dataSources.keys();
  deleteVariableMutable(data, bodyVariableId);
  expect(Array.from(data.props.values())).toEqual([
    expect.objectContaining({ name: "data-body-vars", value: "bodyVariable" }),
    expect.objectContaining({
      name: "data-action",
      value: [{ type: "execute", args: [], code: "bodyVariable" }],
    }),
  ]);
  expect(data.instances.get("boxId")?.children).toEqual([
    { type: "expression", value: "bodyVariable" },
  ]);
});

test("delete data variable payload reuses mutable cleanup semantics", () => {
  const bodyVariable = new Variable("bodyVariable", "one value of body");
  const resourceVariable = new ResourceValue("resourceVariable", {
    url: expression`${bodyVariable}`,
    method: "post",
    searchParams: [],
    headers: [{ name: "auth", value: expression`${bodyVariable}` }],
  });
  const data = renderData(
    <$.Body ws:id="bodyId" data-body-vars={expression`${bodyVariable}`}>
      <$.Box ws:id="boxId" data-box-vars={expression`${resourceVariable}`}>
        {expression`${bodyVariable}`}
      </$.Box>
    </$.Body>
  );
  const [bodyVariableId] = data.dataSources.keys();

  const { payload, deletedVariable } = createDataVariableDeletePayload({
    variableId: bodyVariableId,
    ...data,
  });

  expect(deletedVariable).toEqual(
    expect.objectContaining({ name: "bodyVariable" })
  );
  expect(payload).toEqual([
    {
      namespace: "instances",
      patches: [
        {
          op: "replace",
          path: ["boxId"],
          value: expect.objectContaining({
            children: [{ type: "expression", value: "bodyVariable" }],
          }),
        },
      ],
    },
    {
      namespace: "props",
      patches: [
        {
          op: "replace",
          path: expect.any(Array),
          value: expect.objectContaining({
            name: "data-body-vars",
            value: "bodyVariable",
          }),
        },
      ],
    },
    {
      namespace: "dataSources",
      patches: [{ op: "remove", path: [bodyVariableId] }],
    },
    {
      namespace: "resources",
      patches: [
        {
          op: "replace",
          path: expect.any(Array),
          value: expect.objectContaining({
            url: "bodyVariable",
            headers: [{ name: "auth", value: "bodyVariable" }],
          }),
        },
      ],
    },
  ]);
  expect(data.instances.get("boxId")?.children).toEqual([
    { type: "expression", value: encodeDataVariableId(bodyVariableId) },
  ]);
});

test("delete variable and unset it in resources", () => {
  const bodyVariable = new Variable("bodyVariable", "one value of body");
  const resourceVariable = new ResourceValue("resourceVariable", {
    url: expression`${bodyVariable}`,
    method: "post",
    searchParams: [{ name: "filter", value: expression`${bodyVariable}` }],
    headers: [{ name: "auth", value: expression`${bodyVariable}` }],
    body: expression`${bodyVariable}`,
  });
  const resourceProp = new ResourceValue("resourceProp", {
    url: expression`${bodyVariable}`,
    method: "post",
    searchParams: [{ name: "filter", value: expression`${bodyVariable}` }],
    headers: [{ name: "auth", value: expression`${bodyVariable}` }],
    body: expression`${bodyVariable}`,
  });
  const data = renderData(
    <$.Body ws:id="bodyId" data-body-vars={expression`${bodyVariable}`}>
      <$.Box
        ws:id="boxId"
        data-box-vars={expression`${resourceVariable}`}
        data-resource={resourceProp}
      ></$.Box>
    </$.Body>
  );
  expect(Array.from(data.dataSources.values())).toEqual([
    expect.objectContaining({ scopeInstanceId: "bodyId" }),
    expect.objectContaining({ scopeInstanceId: "boxId" }),
  ]);
  const [bodyVariableId] = data.dataSources.keys();
  deleteVariableMutable(data, bodyVariableId);
  expect(Array.from(data.resources.values())).toEqual([
    expect.objectContaining({
      url: "bodyVariable",
      method: "post",
      searchParams: [{ name: "filter", value: "bodyVariable" }],
      headers: [{ name: "auth", value: "bodyVariable" }],
      body: "bodyVariable",
    }),
    expect.objectContaining({
      url: "bodyVariable",
      method: "post",
      searchParams: [{ name: "filter", value: "bodyVariable" }],
      headers: [{ name: "auth", value: "bodyVariable" }],
      body: "bodyVariable",
    }),
  ]);
});

test("rebind expressions with parent variable when delete variable on child", () => {
  const bodyVariable = new Variable("myVariable", "one value of body");
  const boxVariable = new Variable("myVariable", "one value of body");
  const data = renderData(
    <$.Body ws:id="bodyId" data-body-vars={expression`${bodyVariable}`}>
      <$.Box ws:id="boxId" data-box-vars={expression`${boxVariable}`}>
        <$.Text ws:id="textId">{expression`${boxVariable}`}</$.Text>
      </$.Box>
    </$.Body>
  );
  expect(Array.from(data.dataSources.values())).toEqual([
    expect.objectContaining({ scopeInstanceId: "bodyId" }),
    expect.objectContaining({ scopeInstanceId: "boxId" }),
  ]);
  const [bodyVariableId, boxVariableId] = data.dataSources.keys();
  deleteVariableMutable(data, boxVariableId);
  const bodyIdentifier = encodeDataVariableId(bodyVariableId);
  expect(data.instances.get("textId")?.children).toEqual([
    { type: "expression", value: bodyIdentifier },
  ]);
});

test("prevent rebinding with variables outside of slot content scope", () => {
  const bodyVariable = new Variable("myVariable", "one value of body");
  const boxVariable = new Variable("myVariable", "one value of body");
  const data = renderData(
    <$.Body ws:id="bodyId" data-body-vars={expression`${bodyVariable}`}>
      <$.Slot>
        <$.Fragment>
          <$.Box ws:id="boxId" data-box-vars={expression`${boxVariable}`}>
            <$.Text ws:id="textId">{expression`${boxVariable}`}</$.Text>
          </$.Box>
        </$.Fragment>
      </$.Slot>
    </$.Body>
  );
  expect(Array.from(data.dataSources.values())).toEqual([
    expect.objectContaining({ scopeInstanceId: "bodyId" }),
    expect.objectContaining({ scopeInstanceId: "boxId" }),
  ]);
  const [_bodyVariableId, boxVariableId] = data.dataSources.keys();
  deleteVariableMutable(data, boxVariableId);
  expect(data.instances.get("textId")?.children).toEqual([
    { type: "expression", value: "myVariable" },
  ]);
});

test("unset global variables on all pages when delete", () => {
  const globalVariable = new Variable("globalVariable", "");
  const pages = createDefaultPages({ rootInstanceId: "homeBodyId" });
  pages.pages.set("aboutPage", {
    id: "",
    name: "",
    path: "",
    title: "",
    meta: {},
    rootInstanceId: "aboutBodyId",
  });
  const data = {
    pages,
    ...renderData(
      <ws.root ws:id={ROOT_INSTANCE_ID} vars={expression`${globalVariable}`}>
        <$.Body ws:id="homeBodyId">
          <$.Text ws:id="homeTextId">{expression`${globalVariable}`}</$.Text>
        </$.Body>
        <$.Body ws:id="aboutBodyId">
          <$.Text ws:id="aboutTextId">{expression`${globalVariable}`}</$.Text>
        </$.Body>
      </ws.root>
    ),
  };
  data.instances.delete(ROOT_INSTANCE_ID);
  expect(data.dataSources.size).toEqual(1);
  const [globalVariableId] = data.dataSources.keys();
  deleteVariableMutable(data, globalVariableId);
  expect(data.instances.get("homeTextId")?.children).toEqual([
    { type: "expression", value: "globalVariable" },
  ]);
  expect(data.instances.get("aboutTextId")?.children).toEqual([
    { type: "expression", value: "globalVariable" },
  ]);
});

test("unset legacy global variables with missing scope when delete", () => {
  const data = {
    pages: createDefaultPages({ rootInstanceId: "homeBodyId" }),
    ...renderData(
      <$.Body ws:id="homeBodyId">
        <$.Text ws:id="homeTextId"></$.Text>
      </$.Body>
    ),
  };
  data.pages.pages.set("aboutPage", {
    id: "",
    name: "",
    path: "",
    title: "",
    meta: {},
    rootInstanceId: "aboutBodyId",
  });
  data.instances.set("aboutBodyId", {
    id: "aboutBodyId",
    type: "instance",
    component: "Body",
    children: [{ type: "id", value: "aboutTextId" }],
  });
  data.instances.set("aboutTextId", {
    id: "aboutTextId",
    type: "instance",
    component: "Text",
    children: [],
  });
  data.dataSources.set("legacyGlobalVariableId", {
    id: "legacyGlobalVariableId",
    name: "legacyGlobalVariable",
    type: "variable",
    value: { type: "string", value: "" },
  });
  const legacyGlobalIdentifier = encodeDataVariableId("legacyGlobalVariableId");
  data.instances.get("homeTextId")!.children = [
    { type: "expression", value: legacyGlobalIdentifier },
  ];
  data.instances.get("aboutTextId")!.children = [
    { type: "expression", value: legacyGlobalIdentifier },
  ];

  deleteVariableMutable(data, "legacyGlobalVariableId");

  expect(data.instances.get("homeTextId")?.children).toEqual([
    { type: "expression", value: "legacyGlobalVariable" },
  ]);
  expect(data.instances.get("aboutTextId")?.children).toEqual([
    { type: "expression", value: "legacyGlobalVariable" },
  ]);
});

test("unset global variables in slots when delete", () => {
  const globalVariable = new Variable("globalVariable", "");
  const data = {
    pages: createDefaultPages({ rootInstanceId: "bodyId" }),
    ...renderData(
      <ws.root ws:id={ROOT_INSTANCE_ID} vars={expression`${globalVariable}`}>
        <$.Body ws:id="bodyId">
          <$.Slot ws:id="slotId">
            <$.Fragment ws:id="fragmentId">
              <$.Text ws:id="textId">{expression`${globalVariable}`}</$.Text>
            </$.Fragment>
          </$.Slot>
        </$.Body>
      </ws.root>
    ),
  };
  data.instances.delete(ROOT_INSTANCE_ID);
  expect(data.dataSources.size).toEqual(1);
  const [globalVariableId] = data.dataSources.keys();
  deleteVariableMutable(data, globalVariableId);
  expect(data.instances.get("textId")?.children).toEqual([
    { type: "expression", value: "globalVariable" },
  ]);
});

test("unset body variables in page meta when delete", () => {
  const bodyVariable = new Variable("bodyVariable", "");
  const data = {
    pages: createDefaultPages({ rootInstanceId: "bodyId" }),
    ...renderData(
      <$.Body ws:id="bodyId" vars={expression`${bodyVariable}`}></$.Body>
    ),
  };
  expect(data.dataSources.size).toEqual(1);
  const [bodyVariableId] = data.dataSources.keys();
  const bodyIdentifier = encodeDataVariableId(bodyVariableId);
  const homePage = getHomePage(data.pages);
  homePage.title = bodyIdentifier;
  homePage.meta = {
    description: bodyIdentifier,
    excludePageFromSearch: bodyIdentifier,
    socialImageUrl: bodyIdentifier,
    language: bodyIdentifier,
    status: bodyIdentifier,
    redirect: bodyIdentifier,
    custom: [{ property: "auth", content: bodyIdentifier }],
  };
  deleteVariableMutable(data, bodyVariableId);
  expect(homePage.title).toEqual(`bodyVariable`);
  expect(homePage.meta.description).toEqual(`bodyVariable`);
  expect(homePage.meta.excludePageFromSearch).toEqual(`bodyVariable`);
  expect(homePage.meta.socialImageUrl).toEqual(`bodyVariable`);
  expect(homePage.meta.language).toEqual(`bodyVariable`);
  expect(homePage.meta.status).toEqual(`bodyVariable`);
  expect(homePage.meta.redirect).toEqual(`bodyVariable`);
  expect(homePage.meta.custom?.[0].content).toEqual(`bodyVariable`);
});

test("unset global variables in all pages meta when delete", () => {
  const globalVariable = new Variable("globalVariable", "");
  const data = {
    pages: createDefaultPages({ rootInstanceId: "homeBodyId" }),
    ...renderData(
      <ws.root ws:id={ROOT_INSTANCE_ID} vars={expression`${globalVariable}`}>
        <$.Body ws:id="homeBodyId"></$.Body>
        <$.Body ws:id="aboutBodyId"></$.Body>
      </ws.root>
    ),
  };
  data.instances.delete(ROOT_INSTANCE_ID);
  data.pages.pages.set("aboutPage", {
    id: "",
    name: "",
    path: "",
    title: "",
    meta: {},
    rootInstanceId: "aboutBodyId",
  });
  expect(data.dataSources.size).toEqual(1);
  const [globalVariableId] = data.dataSources.keys();
  const globalIdentifier = encodeDataVariableId(globalVariableId);
  for (const page of getAllPages(data.pages)) {
    page.title = globalIdentifier;
    page.meta = {
      description: globalIdentifier,
      excludePageFromSearch: globalIdentifier,
      socialImageUrl: globalIdentifier,
      language: globalIdentifier,
      status: globalIdentifier,
      redirect: globalIdentifier,
      custom: [{ property: "auth", content: globalIdentifier }],
    };
  }
  deleteVariableMutable(data, globalVariableId);
  for (const page of getAllPages(data.pages)) {
    expect(page.title).toEqual(`globalVariable`);
    expect(page.meta.description).toEqual(`globalVariable`);
    expect(page.meta.excludePageFromSearch).toEqual(`globalVariable`);
    expect(page.meta.socialImageUrl).toEqual(`globalVariable`);
    expect(page.meta.language).toEqual(`globalVariable`);
    expect(page.meta.status).toEqual(`globalVariable`);
    expect(page.meta.redirect).toEqual(`globalVariable`);
    expect(page.meta.custom?.[0].content).toEqual(`globalVariable`);
  }
});

test("find variable usages by instance", () => {
  const bodyVariable = new Variable("bodyVariable", "");
  const boxVariable = new Variable("boxVariable", "");
  const data = {
    pages: createDefaultPages({ rootInstanceId: "bodyId" }),
    ...renderData(
      <$.Body
        ws:id="bodyId"
        vars={expression`${bodyVariable}`}
        data-prop={expression`${bodyVariable} + "test"`}
      >
        <$.Box
          ws:id="boxId"
          vars={expression`${boxVariable}`}
          data-prop={expression`${boxVariable} + ${bodyVariable}`}
        >
          <$.Text ws:id="textId">{expression`${bodyVariable}`}</$.Text>
        </$.Box>
      </$.Body>
    ),
  };
  const bodyVariableId = [...data.dataSources.values()].find(
    (ds) => ds.name === "bodyVariable"
  )?.id;
  const boxVariableId = [...data.dataSources.values()].find(
    (ds) => ds.name === "boxVariable"
  )?.id;

  const usagesByInstance = findVariableUsagesByInstance({
    ...data,
    startingInstanceId: "bodyId",
  });

  expect(usagesByInstance.get(bodyVariableId!)).toEqual(
    new Set(["bodyId", "boxId", "textId"])
  );
  expect(usagesByInstance.get(boxVariableId!)).toEqual(new Set(["boxId"]));
});

test("find variable usages from root includes all pages", () => {
  const globalVariable = new Variable("globalVariable", "");
  const data = {
    pages: createDefaultPages({ rootInstanceId: "homeBodyId" }),
    ...renderData(
      <ws.root ws:id={ROOT_INSTANCE_ID} vars={expression`${globalVariable}`}>
        <$.Body ws:id="homeBodyId">
          <$.Box ws:id="homeBoxId" data-prop={expression`${globalVariable}`} />
        </$.Body>
        <$.Body ws:id="aboutBodyId">
          <$.Box ws:id="aboutBoxId" data-prop={expression`${globalVariable}`} />
        </$.Body>
      </ws.root>
    ),
  };
  data.instances.delete(ROOT_INSTANCE_ID);
  data.pages.pages.set("aboutPage", {
    id: "aboutPage",
    name: "About",
    path: "/about",
    title: "",
    meta: {},
    rootInstanceId: "aboutBodyId",
  });

  const [globalVariableId] = data.dataSources.keys();

  const usagesByInstance = findVariableUsagesByInstance({
    ...data,
    startingInstanceId: ROOT_INSTANCE_ID,
  });

  // Global variable is used in expressions on both boxes and the root (where it's defined)
  expect(usagesByInstance.get(globalVariableId)).toEqual(
    new Set([ROOT_INSTANCE_ID, "homeBoxId", "aboutBoxId"])
  );
});

test("find variable usages in page meta", () => {
  const bodyVariable = new Variable("bodyVariable", "");
  const data = {
    pages: createDefaultPages({ rootInstanceId: "bodyId" }),
    ...renderData(
      <$.Body ws:id="bodyId" vars={expression`${bodyVariable}`}></$.Body>
    ),
  };
  const [bodyVariableId] = data.dataSources.keys();
  const bodyIdentifier = encodeDataVariableId(bodyVariableId);

  const homePage = getHomePage(data.pages);
  homePage.title = bodyIdentifier;
  homePage.meta = {
    description: bodyIdentifier,
    excludePageFromSearch: bodyIdentifier,
    socialImageUrl: bodyIdentifier,
  };

  const usagesByInstance = findVariableUsagesByInstance({
    ...data,
    startingInstanceId: "bodyId",
  });

  // Page meta expressions are attributed to the page's root instance
  expect(usagesByInstance.get(bodyVariableId)).toEqual(new Set(["bodyId"]));
});

test("find variable usages counts unique instances not expressions", () => {
  const bodyVariable = new Variable("bodyVariable", "");
  const data = {
    pages: createDefaultPages({ rootInstanceId: "bodyId" }),
    ...renderData(
      <$.Body
        ws:id="bodyId"
        vars={expression`${bodyVariable}`}
        data-prop1={expression`${bodyVariable}`}
        data-prop2={expression`${bodyVariable}`}
        data-prop3={expression`${bodyVariable}`}
      ></$.Body>
    ),
  };
  const [bodyVariableId] = data.dataSources.keys();

  const usagesByInstance = findVariableUsagesByInstance({
    ...data,
    startingInstanceId: "bodyId",
  });

  // Even though bodyVariable is used 4 times (in 4 different expressions),
  // it should only appear once in the set since it's all on the same instance
  expect(usagesByInstance.get(bodyVariableId)).toEqual(new Set(["bodyId"]));
  expect(usagesByInstance.get(bodyVariableId)?.size).toBe(1);
});

describe("createResourceValue", () => {
  test("parse resource create and update inputs used by the API", () => {
    expect(
      resourceFieldsInput.parse({
        name: "Users",
        method: "get",
        url: '"https://example.com/users"',
        searchParams: [{ name: "page", value: '"1"' }],
        headers: [{ name: "Accept", value: '"application/json"' }],
        control: "system",
      })
    ).toEqual({
      name: "Users",
      method: "get",
      url: '"https://example.com/users"',
      searchParams: [{ name: "page", value: '"1"' }],
      headers: [{ name: "Accept", value: '"application/json"' }],
      control: "system",
    });

    expect(resourceFieldsUpdateInput.parse({ name: "Updated" })).toEqual({
      name: "Updated",
    });
  });

  test("reject invalid resource controls", () => {
    expect(() =>
      resourceFieldsInput.parse({
        name: "Users",
        method: "get",
        url: '"https://example.com/users"',
        searchParams: [],
        headers: [],
        control: "manual",
      })
    ).toThrow();
  });

  test("reject invalid resource expressions", () => {
    expect(() =>
      resourceFieldsInput.parse({
        name: "Users",
        method: "get",
        url: "https://example.com/users",
        searchParams: [],
        headers: [],
      })
    ).toThrow();
    expect(() =>
      resourceFieldsUpdateInput.parse({
        searchParams: [{ name: "page", value: "page value" }],
      })
    ).toThrow();
  });

  test("creates resource values through the sdk schema", () => {
    expect(
      createResourceValue({
        id: "resource-id",
        name: "Users",
        method: "post",
        url: '"https://example.com/users"',
        searchParams: [{ name: "page", value: '"1"' }],
        headers: [{ name: "Authorization", value: '"Bearer token"' }],
        body: '"body"',
      })
    ).toEqual({
      id: "resource-id",
      name: "Users",
      method: "post",
      url: '"https://example.com/users"',
      searchParams: [{ name: "page", value: '"1"' }],
      headers: [{ name: "Authorization", value: '"Bearer token"' }],
      body: '"body"',
    });
  });

  test("omits empty body values", () => {
    expect(
      createResourceValue({
        id: "resource-id",
        name: "Users",
        method: "get",
        url: '"https://example.com/users"',
        searchParams: [],
        headers: [],
        body: "",
      })
    ).toHaveProperty("body", undefined);
  });
});

describe("findResource", () => {
  test("finds resources by id", () => {
    expect(
      findResource(
        [
          {
            id: "resource-id",
            name: "Users",
            method: "get",
            url: '"https://example.com/users"',
            searchParams: [],
            headers: [],
          },
        ],
        "resource-id"
      )?.name
    ).toBe("Users");
    expect(findResource([], "missing")).toBeUndefined();
  });
});

describe("serializeResources", () => {
  test("reports resource exposure and filters by scoped data source", () => {
    const resources: Resource[] = [
      {
        id: "resource-1",
        name: "Users",
        method: "get",
        url: '"https://example.com/users"',
        searchParams: [],
        headers: [],
      },
      {
        id: "resource-2",
        name: "Posts",
        method: "post",
        url: '"https://example.com/posts"',
        searchParams: [],
        headers: [],
      },
    ];
    const dataSources: DataSource[] = [
      {
        id: "data-source-other-scope",
        scopeInstanceId: "other-box",
        name: "usersOther",
        type: "resource",
        resourceId: "resource-1",
      },
      {
        id: "data-source-1",
        scopeInstanceId: "box",
        name: "users",
        type: "resource",
        resourceId: "resource-1",
      },
    ];

    expect(serializeResources({ resources, dataSources })).toEqual({
      resources: [
        {
          id: "resource-1",
          name: "Users",
          method: "get",
          url: '"https://example.com/users"',
          scopeInstanceId: "other-box",
          exposedAsDataSource: true,
          dataSourceId: "data-source-other-scope",
        },
        {
          id: "resource-2",
          name: "Posts",
          method: "post",
          url: '"https://example.com/posts"',
          scopeInstanceId: undefined,
          exposedAsDataSource: false,
          dataSourceId: undefined,
        },
      ],
    });
    expect(
      serializeResources({ resources, dataSources, scopeInstanceId: "box" })
    ).toEqual({
      resources: [
        {
          id: "resource-1",
          name: "Users",
          method: "get",
          url: '"https://example.com/users"',
          scopeInstanceId: "box",
          exposedAsDataSource: true,
          dataSourceId: "data-source-1",
        },
      ],
    });
  });
});

describe("resource patch helpers", () => {
  const resource: Resource = {
    id: "resource",
    name: "Users",
    method: "get",
    url: '"https://example.com/users"',
    searchParams: [],
    headers: [],
  };

  test("upserts resource variables and rebinds expressions", () => {
    const body: Instance = {
      type: "instance",
      id: "body",
      component: "Body",
      children: [{ type: "id", value: "box" }],
    };
    const box: Instance = {
      type: "instance",
      id: "box",
      component: "Box",
      children: [
        { type: "expression", value: encodeDataVariableId("body-var") },
      ],
    };
    const data = {
      pages: undefined,
      instances: new Map([
        [body.id, body],
        [box.id, box],
      ]),
      props: new Map(),
      dataSources: new Map<DataSource["id"], DataSource>([
        [
          "body-var",
          {
            id: "body-var",
            scopeInstanceId: "body",
            name: "Users",
            type: "variable",
            value: { type: "string", value: "fallback" },
          },
        ],
      ]),
      resources: new Map<Resource["id"], Resource>(),
    };

    upsertResourceMutable({
      data,
      resource,
      dataSourceId: "resource-var",
      scopeInstanceId: "box",
      dataSourceName: "Users",
    });

    expect(data.resources.get("resource")).toEqual(resource);
    expect(data.dataSources.get("resource-var")).toEqual({
      id: "resource-var",
      scopeInstanceId: "box",
      name: "Users",
      type: "resource",
      resourceId: "resource",
    });
    expect(data.instances.get("box")?.children).toEqual([
      { type: "expression", value: encodeDataVariableId("resource-var") },
    ]);
  });

  test("creates resource upsert patches from builder data", () => {
    const body: Instance = {
      type: "instance",
      id: "body",
      component: "Body",
      children: [{ type: "id", value: "box" }],
    };
    const box: Instance = {
      type: "instance",
      id: "box",
      component: "Box",
      children: [
        { type: "expression", value: encodeDataVariableId("body-var") },
      ],
    };

    expect(
      createResourceUpsertPatchPayload({
        build: {
          pages: {
            homePageId: "page",
            rootFolderId: "root-folder",
            pages: new Map([
              [
                "page",
                {
                  id: "page",
                  name: "Home",
                  path: "",
                  title: "Home",
                  rootInstanceId: "body",
                  meta: {},
                },
              ],
            ]),
            folders: new Map([
              [
                "root-folder",
                {
                  id: "root-folder",
                  name: "Root",
                  slug: "",
                  children: ["page"],
                },
              ],
            ]),
          },
          instances: [body, box],
          props: [],
          dataSources: [
            {
              id: "body-var",
              scopeInstanceId: "body",
              name: "Users",
              type: "variable",
              value: { type: "string", value: "fallback" },
            },
          ],
          resources: [],
          breakpoints: [],
          styleSources: [],
          styleSourceSelections: [],
          styles: [],
        },
        resource,
        dataSourceId: "resource-var",
        scopeInstanceId: "box",
        dataSourceName: "Users",
      })
    ).toEqual([
      {
        namespace: "instances",
        patches: [
          {
            op: "replace",
            path: ["box"],
            value: {
              ...box,
              children: [
                {
                  type: "expression",
                  value: encodeDataVariableId("resource-var"),
                },
              ],
            },
          },
        ],
      },
      {
        namespace: "dataSources",
        patches: [
          {
            op: "add",
            path: ["resource-var"],
            value: {
              id: "resource-var",
              scopeInstanceId: "box",
              name: "Users",
              type: "resource",
              resourceId: "resource",
            },
          },
        ],
      },
      {
        namespace: "resources",
        patches: [{ op: "add", path: ["resource"], value: resource }],
      },
    ]);
  });

  test("creates resource and optional data source patches", () => {
    expect(
      createResourceCreatePayload({
        resourceId: "resource",
        resource,
        resources: [],
        dataSources: [],
        dataSourceId: "data-source",
        scopeInstanceId: "box",
      })
    ).toEqual({
      payload: [
        {
          namespace: "resources",
          patches: [{ op: "add", path: ["resource"], value: resource }],
        },
        {
          namespace: "dataSources",
          patches: [
            {
              op: "add",
              path: ["data-source"],
              value: {
                id: "data-source",
                scopeInstanceId: "box",
                name: "Users",
                type: "resource",
                resourceId: "resource",
              },
            },
          ],
        },
      ],
      dataSourceId: "data-source",
      errors: [],
    });
  });

  test("reports resource create id conflicts", () => {
    expect(
      createResourceCreatePayload({
        resourceId: "resource",
        resource,
        resources: [resource],
        dataSources: [
          {
            id: "data-source",
            scopeInstanceId: "box",
            name: "Users",
            type: "resource",
            resourceId: "resource",
          },
        ],
        dataSourceId: "data-source",
        scopeInstanceId: "box",
      }).errors
    ).toEqual([
      { type: "duplicate-resource-id", resourceId: "resource" },
      { type: "duplicate-data-source-id", dataSourceId: "data-source" },
    ]);
  });

  test("creates resource update patches with data source metadata", () => {
    const dataSource: DataSource = {
      id: "data-source",
      scopeInstanceId: "box",
      name: "Users",
      type: "resource",
      resourceId: "resource",
    };

    expect(
      createResourceUpdatePayload({
        resource,
        values: { name: "Updated" },
        dataSources: [dataSource],
        dataSourceName: "Updated source",
        scopeInstanceId: "root",
      })
    ).toEqual([
      {
        namespace: "resources",
        patches: [
          { op: "replace", path: ["resource", "name"], value: "Updated" },
        ],
      },
      {
        namespace: "dataSources",
        patches: [
          {
            op: "replace",
            path: ["data-source", "name"],
            value: "Updated source",
          },
          {
            op: "replace",
            path: ["data-source", "scopeInstanceId"],
            value: "root",
          },
        ],
      },
    ]);
  });

  test("creates resource delete payload and guards prop usages", () => {
    const prop: Prop = {
      id: "prop",
      instanceId: "box",
      name: "data",
      type: "resource",
      value: "resource",
    };
    const dataSource: DataSource = {
      id: "data-source",
      scopeInstanceId: "box",
      name: "Users",
      type: "resource",
      resourceId: "resource",
    };

    expect(
      createResourceDeletePayload({
        resource,
        props: [prop],
        dataSources: [dataSource],
      })
    ).toEqual({ payload: [], dataSourceIds: [], propIds: [], isUsed: true });

    expect(
      createResourceDeletePayload({
        resource,
        props: [prop],
        dataSources: [dataSource],
        force: true,
      })
    ).toEqual({
      payload: [
        {
          namespace: "resources",
          patches: [{ op: "remove", path: ["resource"] }],
        },
        {
          namespace: "dataSources",
          patches: [{ op: "remove", path: ["data-source"] }],
        },
        {
          namespace: "props",
          patches: [{ op: "remove", path: ["prop"] }],
        },
      ],
      dataSourceIds: ["data-source"],
      propIds: ["prop"],
      isUsed: false,
    });
  });
});

describe("getResourceExpressionErrors", () => {
  test("returns field-prefixed expression errors", () => {
    expect(
      getResourceExpressionErrors({
        url: "invalid +",
        body: "body +",
        headers: [{ name: "Authorization", value: "header +" }],
        searchParams: [{ name: "q", value: "query +" }],
      })
    ).toEqual([
      expect.stringMatching(/^url: /),
      expect.stringMatching(/^body: /),
      expect.stringMatching(/^headers\.0\.value: /),
      expect.stringMatching(/^searchParams\.0\.value: /),
    ]);
  });

  test("allows omitted optional expressions", () => {
    expect(getResourceExpressionErrors({})).toEqual([]);
  });
});
