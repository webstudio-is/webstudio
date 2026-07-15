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
  computeExpressionWithinScope,
  createDataVariable,
  dataVariableCreateInput,
  createDataVariableCreatePayload,
  createDataVariableDeletePayload,
  createUnusedDataVariablesDeletePayload,
  createDataVariableUpdatePayload,
  createDataVariableValueFromInput,
  createResourceFieldsFromResource,
  createResource,
  createResourceCreatePayload,
  createResourceDeletePayload,
  createResourceFieldsFromFormData,
  createResourceUpdatePayload,
  createResourceUpsertPatchPayload,
  createResourceValue,
  createResourceValueFromFormData,
  decodeDataVariableName,
  deleteVariableMutable,
  deleteUnusedDataVariables,
  encodeDataVariableName,
  findAvailableVariables,
  findResource,
  findUnusedDataVariableIds,
  findUnsetVariableNames,
  findVariableUsagesByInstance,
  getDataVariableJsonExpressionErrors,
  getResourceExpressionErrors,
  rebindTreeVariablesMutable,
  replaceResourceText,
  replaceDataSourcesInExpression,
  restoreExpressionVariables,
  resourceCreateInput,
  resourceFieldsInput,
  resourceFieldsUpdateInput,
  produceWebstudioDataMutation,
  serializeDataVariables,
  serializeResources,
  unsetExpressionVariables,
  updateDataVariable,
  updateResource,
  upsertResource,
  upsertResourceProp,
  upsertResourceMutable,
  validateDataVariableJsonValue,
  validateDataVariableNameWithSources,
  validateDataVariableNumberValue,
  validateResourceBodyExpression,
  validateResourceUrlExpression,
} from "./data";

test("creates Map-backed patches without mutating caller-owned data", () => {
  const before = {
    instances: new Map([
      [
        "instance",
        {
          id: "instance",
          children: [{ type: "text", value: "Before" }],
        },
      ],
    ]),
  };
  const original = structuredClone(before);

  const result = produceWebstudioDataMutation(before, (draft) => {
    draft.instances.get("instance")?.children.push({
      type: "text",
      value: "After",
    });
  });

  expect(before).toEqual(original);
  expect(result.data).not.toBe(before);
  expect(result.data.instances.get("instance")?.children).toEqual([
    { type: "text", value: "Before" },
    { type: "text", value: "After" },
  ]);
  expect(result.payload).toEqual([
    {
      namespace: "instances",
      patches: [
        {
          op: "add",
          path: ["instance", "children", 1],
          value: { type: "text", value: "After" },
        },
      ],
    },
  ]);
});

test("rejects client-supplied ids on data create inputs", () => {
  expect(
    dataVariableCreateInput.safeParse({
      dataSourceId: "client-variable-id",
      scopeInstanceId: "instance-id",
      name: "title",
      value: { type: "string", value: "Title" },
    }).success
  ).toBe(false);
  expect(
    resourceCreateInput.safeParse({
      resourceId: "client-resource-id",
      dataSourceId: "client-data-source-id",
      resource: {
        name: "Posts",
        method: "get",
        url: '"https://api.example.com/posts"',
      },
      scopeInstanceId: "instance-id",
    }).success
  ).toBe(false);
});

test("requires a scope for explicit render-time resource exposure", () => {
  const result = resourceCreateInput.safeParse({
    resource: {
      name: "Submit",
      method: "post",
      url: '"https://api.example.com/submit"',
      headers: [],
    },
    exposeAsDataSource: true,
  });

  expect(result.success).toBe(false);
  if (result.success === false) {
    expect(result.error.issues).toContainEqual(
      expect.objectContaining({
        path: ["scopeInstanceId"],
        message: "scopeInstanceId is required when exposeAsDataSource is true.",
      })
    );
  }
});

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
  expect(
    validateDataVariableNameWithSources({
      dataSources: [
        ...dataSources,
        {
          id: "variable-2",
          scopeInstanceId: "instance-1",
          name: "otherVariable",
          type: "variable",
          value: { type: "string", value: "" },
        },
      ],
      name: "existingVariable",
      variableId: "variable-2",
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
      variableId: "variable-1",
      scopeInstanceId: "instance-1",
    })
  ).toBeUndefined();
  expect(
    validateDataVariableNameWithSources({
      dataSources: [
        {
          id: "variable-1",
          name: "globalVariable",
          type: "variable",
          value: { type: "string", value: "" },
        },
      ],
      name: "globalVariable",
    })
  ).toEqual({
    type: "duplicate",
    message: "Name is already used by another variable on this instance",
  });
});

test("creates data variable values from form input values", () => {
  expect(
    createDataVariableValueFromInput({ type: "string", value: null })
  ).toEqual({ type: "string", value: "" });
  expect(
    createDataVariableValueFromInput({ type: "number", value: "42" })
  ).toEqual({ type: "number", value: 42 });
  expect(
    createDataVariableValueFromInput({ type: "boolean", value: "on" })
  ).toEqual({ type: "boolean", value: true });
  expect(
    createDataVariableValueFromInput({ type: "boolean", value: null })
  ).toEqual({ type: "boolean", value: false });
  expect(
    createDataVariableValueFromInput({
      type: "json",
      value: '{ "enabled": true }',
    })
  ).toEqual({ type: "json", value: { enabled: true } });
  expect(
    createDataVariableValueFromInput({
      type: "json",
      value: null,
    })
  ).toEqual({ type: "json", value: null });
  expect(
    JSON.parse(
      JSON.stringify(
        createDataVariableValueFromInput({
          type: "json",
          value: null,
        })
      )
    )
  ).toEqual({ type: "json", value: null });
  expect(
    createDataVariableValueFromInput({
      type: "string[]",
      value: '["Draft", "Connected", "Published"]',
    })
  ).toEqual({
    type: "string[]",
    value: ["Draft", "Connected", "Published"],
  });
  expect(() =>
    createDataVariableValueFromInput({
      type: "string[]",
      value: '["Draft", 1]',
    })
  ).toThrow();
  expect(() =>
    createDataVariableValueFromInput({
      type: "string[]",
      value: "",
    })
  ).toThrow();
  expect(
    createDataVariableValueFromInput({ type: "string[]", value: null })
  ).toEqual({ type: "string[]", value: [] });
});

test("validates data variable number values", () => {
  expect(validateDataVariableNumberValue("")).toBe("Value expects a number");
  expect(validateDataVariableNumberValue("abc")).toBe("Invalid number");
  expect(validateDataVariableNumberValue("12")).toBe("");
});

test("reports data variable json expression errors", () => {
  expect(getDataVariableJsonExpressionErrors("{").length).toBeGreaterThan(0);
  expect(getDataVariableJsonExpressionErrors("{ ok: true }")).toEqual([]);
  expect(validateDataVariableJsonValue("{")).toBe("error");
  expect(validateDataVariableJsonValue("{ ok: true }")).toBe("");
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

test("update data variable payload preserves string array values", () => {
  const variable: DataSource = {
    id: "variable-1",
    scopeInstanceId: "instance-1",
    name: "stages",
    type: "variable",
    value: { type: "string[]", value: ["Draft"] },
  };

  expect(
    createDataVariableUpdatePayload({
      variable,
      values: {
        value: {
          type: "string[]",
          value: ["Draft", "Connected", "Published"],
        },
      },
      dataSources: [variable],
    })
  ).toEqual({
    payload: [
      {
        namespace: "dataSources",
        patches: [
          {
            op: "replace",
            path: ["variable-1", "value"],
            value: {
              type: "string[]",
              value: ["Draft", "Connected", "Published"],
            },
          },
        ],
      },
    ],
  });
});

test("create data variable rebinds expressions through runtime operation", () => {
  const body: Instance = {
    type: "instance",
    id: "body",
    component: "Body",
    children: [
      { type: "id", value: "box" },
      { type: "expression", value: "title" },
    ],
  };
  const box: Instance = {
    type: "instance",
    id: "box",
    component: "Box",
    children: [],
  };

  expect(
    createDataVariable(
      {
        pages: createDefaultPages({ rootInstanceId: "body" }),
        instances: new Map([
          [body.id, body],
          [box.id, box],
        ]),
        props: new Map(),
        dataSources: new Map(),
        resources: new Map(),
      },
      {
        scopeInstanceId: "body",
        name: "title",
        value: { type: "string", value: "Hello" },
      },
      { createId: () => "title-id" }
    ).payload
  ).toEqual([
    {
      namespace: "instances",
      patches: [
        {
          op: "replace",
          path: ["body", "children", 1, "value"],
          value: encodeDataVariableId("title-id"),
        },
      ],
    },
    {
      namespace: "dataSources",
      patches: [
        {
          op: "add",
          path: ["title-id"],
          value: {
            id: "title-id",
            scopeInstanceId: "body",
            name: "title",
            type: "variable",
            value: { type: "string", value: "Hello" },
          },
        },
      ],
    },
  ]);
});

test("update data variable converts resource data source and deletes resource", () => {
  const dataSource: DataSource = {
    id: "data-source-id",
    scopeInstanceId: "body",
    name: "resourceName",
    type: "resource",
    resourceId: "resource-id",
  };
  const resource: Resource = {
    id: "resource-id",
    name: "resourceName",
    method: "get",
    url: `"https://example.com"`,
    headers: [],
  };

  expect(
    updateDataVariable(
      {
        pages: createDefaultPages({ rootInstanceId: "body" }),
        instances: new Map([
          [
            "body",
            {
              type: "instance",
              id: "body",
              component: "Body",
              children: [],
            },
          ],
        ]),
        props: new Map(),
        dataSources: new Map([[dataSource.id, dataSource]]),
        resources: new Map([[resource.id, resource]]),
      },
      {
        dataSourceId: dataSource.id,
        values: {
          name: "title",
          value: { type: "string", value: "Hello" },
        },
      }
    ).payload
  ).toEqual([
    {
      namespace: "dataSources",
      patches: [
        {
          op: "replace",
          path: ["data-source-id"],
          value: {
            id: "data-source-id",
            scopeInstanceId: "body",
            name: "title",
            type: "variable",
            value: { type: "string", value: "Hello" },
          },
        },
      ],
    },
    {
      namespace: "resources",
      patches: [{ op: "remove", path: ["resource-id"] }],
    },
  ]);
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
  expect(
    replaceDataSourcesInExpression(
      `$ws$dataSource$oldId = state`,
      new Map([["oldId", "newId"]])
    )
  ).toEqual("$ws$dataSource$newId = state");
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
  const pages = createDefaultPages({ rootInstanceId: "bodyId" });
  const homePage = getHomePage(pages);
  homePage.title = encodeDataVariableId(bodyVariableId);
  homePage.systemDataSourceId = bodyVariableId;

  const { payload, deletedVariable } = createDataVariableDeletePayload({
    variableId: bodyVariableId,
    ...data,
    pages,
  });

  expect(deletedVariable).toEqual(
    expect.objectContaining({ name: "bodyVariable" })
  );
  const pageChange = payload.find((change) => change.namespace === "pages");
  expect(pageChange?.patches).toEqual([
    {
      op: "remove",
      path: ["pages", homePage.id, "systemDataSourceId"],
    },
    {
      op: "replace",
      path: ["pages", homePage.id, "title"],
      value: "bodyVariable",
    },
  ]);
  expect(payload).toEqual([
    expect.objectContaining({
      namespace: "pages",
      patches: [
        {
          op: "remove",
          path: ["pages", homePage.id, "systemDataSourceId"],
        },
        {
          op: "replace",
          path: ["pages", homePage.id, "title"],
          value: "bodyVariable",
        },
      ],
    }),
    {
      namespace: "instances",
      patches: [
        {
          op: "replace",
          path: ["boxId", "children", 0, "value"],
          value: "bodyVariable",
        },
      ],
    },
    {
      namespace: "props",
      patches: [
        {
          op: "replace",
          path: expect.arrayContaining(["value"]),
          value: "bodyVariable",
        },
      ],
    },
    {
      namespace: "dataSources",
      patches: [{ op: "remove", path: [bodyVariableId] }],
    },
    {
      namespace: "resources",
      patches: expect.arrayContaining([
        {
          op: "replace",
          path: expect.arrayContaining(["url"]),
          value: "bodyVariable",
        },
        {
          op: "replace",
          path: expect.arrayContaining(["value"]),
          value: "bodyVariable",
        },
      ]),
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

test("finds and deletes unused data variables in one runtime mutation", () => {
  const usedVariable = new Variable("usedVariable", "");
  const unusedVariable = new Variable("unusedVariable", "");
  const data = {
    pages: createDefaultPages({ rootInstanceId: "bodyId" }),
    ...renderData(
      <$.Body
        ws:id="bodyId"
        vars={expression`${usedVariable};${unusedVariable}`}
        data-prop={expression`${usedVariable}`}
      ></$.Body>
    ),
  };
  const usedVariableId = [...data.dataSources.values()].find(
    (dataSource) => dataSource.name === "usedVariable"
  )!.id;
  const unusedVariableId = [...data.dataSources.values()].find(
    (dataSource) => dataSource.name === "unusedVariable"
  )!.id;

  expect(findUnusedDataVariableIds(data)).toEqual([unusedVariableId]);
  const { payload, deletedVariableIds } =
    createUnusedDataVariablesDeletePayload(data);

  expect(deletedVariableIds).toEqual([unusedVariableId]);
  expect(payload).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        namespace: "dataSources",
        patches: expect.arrayContaining([
          { op: "remove", path: [unusedVariableId] },
        ]),
      }),
    ])
  );
  expect(deleteUnusedDataVariables(data, {}).result).toEqual({
    dataSourceIds: [unusedVariableId],
    deletedCount: 1,
  });
  expect(findUnusedDataVariableIds(data)).toEqual([unusedVariableId]);
  expect(data.dataSources.has(usedVariableId)).toBe(true);
  expect(data.dataSources.has(unusedVariableId)).toBe(true);
});

test("delete unused data variables is a noop when all variables are used", () => {
  const usedVariable = new Variable("usedVariable", "");
  const data = {
    pages: createDefaultPages({ rootInstanceId: "bodyId" }),
    ...renderData(
      <$.Body
        ws:id="bodyId"
        vars={expression`${usedVariable}`}
        data-prop={expression`${usedVariable}`}
      ></$.Body>
    ),
  };

  expect(deleteUnusedDataVariables(data, {})).toMatchObject({
    payload: [],
    result: { dataSourceIds: [], deletedCount: 0 },
    invalidatesNamespaces: [],
  });
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

  test("accepts explicit literal request values without changing expressions", () => {
    expect(
      resourceFieldsInput.parse({
        name: "Users",
        method: "post",
        url: "https://example.com/users",
        searchParams: [
          { name: "source", value: { type: "literal", value: "homepage" } },
          { name: "page", value: "filters.page" },
        ],
        headers: [
          {
            name: "Content-Type",
            value: { type: "literal", value: "application/json" },
          },
          { name: "Authorization", value: '"Bearer " + auth.token' },
        ],
        body: { type: "literal", value: "Plain text body" },
      })
    ).toMatchObject({
      url: '"https://example.com/users"',
      searchParams: [
        {
          name: "source",
          value: { type: "literal", value: "homepage" },
        },
        { name: "page", value: "filters.page" },
      ],
      headers: [
        {
          name: "Content-Type",
          value: { type: "literal", value: "application/json" },
        },
        { name: "Authorization", value: '"Bearer " + auth.token' },
      ],
      body: { type: "literal", value: "Plain text body" },
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
        url: '"https://example.com/users" +',
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

  test("reject invalid literal resource urls", () => {
    expect(() =>
      resourceFieldsInput.parse({
        name: "Users",
        method: "get",
        url: '""',
        searchParams: [],
        headers: [],
      })
    ).toThrow("url: URL is required");
    expect(() =>
      resourceFieldsUpdateInput.parse({
        url: '"not a url"',
      })
    ).toThrow("url: URL is invalid");
    expect(() =>
      resourceFieldsInput.parse({
        name: "Users",
        method: "get",
        url: "123",
        searchParams: [],
        headers: [],
      })
    ).toThrow("url: URL expects a string");
  });

  test("accept local resource urls", () => {
    expect(
      resourceFieldsInput.parse({
        name: "Current Date",
        method: "get",
        url: '"/$resources/current-date"',
        searchParams: [],
        headers: [],
        control: "system",
      })
    ).toMatchObject({
      url: '"/$resources/current-date"',
      control: "system",
    });
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

  test("creates resource fields from resource values", () => {
    expect(
      createResourceFieldsFromResource({
        id: "resource-id",
        name: "Users",
        method: "post",
        url: '"https://example.com/users"',
        searchParams: [{ name: "page", value: '"1"' }],
        headers: [{ name: "Authorization", value: '"Bearer token"' }],
        body: '"body"',
      })
    ).toEqual({
      name: "Users",
      method: "post",
      url: '"https://example.com/users"',
      searchParams: [{ name: "page", value: '"1"' }],
      headers: [{ name: "Authorization", value: '"Bearer token"' }],
      body: '"body"',
    });
  });

  test("creates resource fields and values from form data", () => {
    const formData = {
      get: (name: string) =>
        new Map<string, unknown>([
          ["name", "Users"],
          ["url", '"https://example.com/users"'],
          ["method", "post"],
          ["body", ""],
        ]).get(name),
      getAll: (name: string) =>
        new Map<string, unknown[]>([
          ["search-param-name", ["q", ""]],
          ["search-param-value", ["search", "ignored"]],
          ["header-name", ["Content-Type"]],
          ["header-value", ['"application/json"']],
        ]).get(name) ?? [],
    };

    expect(createResourceFieldsFromFormData({ formData })).toEqual({
      name: "Users",
      method: "post",
      url: '"https://example.com/users"',
      searchParams: [{ name: "q", value: "search" }],
      headers: [{ name: "Content-Type", value: '"application/json"' }],
      body: undefined,
    });
    expect(
      createResourceValueFromFormData({ id: "resource-id", formData })
    ).toEqual({
      id: "resource-id",
      name: "Users",
      method: "post",
      url: '"https://example.com/users"',
      searchParams: [{ name: "q", value: "search" }],
      headers: [{ name: "Content-Type", value: '"application/json"' }],
      body: undefined,
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

  const createResourceState = () => ({
    pages: createDefaultPages({ rootInstanceId: "body" }),
    instances: new Map(),
    props: new Map(),
    dataSources: new Map(),
    resources: new Map(),
    breakpoints: new Map(),
    styleSources: new Map(),
    styleSourceSelections: new Map(),
    styles: new Map(),
  });

  test("normalizes literal expressions when creating a resource", () => {
    const result = createResource(
      createResourceState(),
      {
        resource: resourceFieldsInput.parse({
          name: "Users",
          method: "post",
          url: "https://example.com/users",
          searchParams: [
            { name: "status", value: { type: "literal", value: "active" } },
          ],
          headers: [
            {
              name: "Content-Type",
              value: { type: "literal", value: "application/json" },
            },
          ],
          body: { type: "literal", value: "request body" },
        }),
      },
      { createId: () => "resource-id" }
    );

    expect(result.payload).toContainEqual({
      namespace: "resources",
      patches: [
        {
          op: "add",
          path: ["resource-id"],
          value: {
            id: "resource-id",
            name: "Users",
            control: undefined,
            method: "post",
            url: '"https://example.com/users"',
            searchParams: [{ name: "status", value: '"active"' }],
            headers: [{ name: "Content-Type", value: '"application/json"' }],
            body: '"request body"',
          },
        },
      ],
    });
    expect(result.payload).not.toContainEqual(
      expect.objectContaining({ namespace: "dataSources" })
    );
  });

  test("exposes scoped GET resources as render data by default", () => {
    const state = createResourceState();
    state.instances.set("body", {
      type: "instance",
      id: "body",
      component: "Body",
      children: [],
    });
    const ids = ["resource-id", "data-source-id"];

    const result = createResource(
      state,
      {
        resource: resourceFieldsInput.parse({
          name: "Users",
          method: "get",
          url: "https://example.com/users",
          headers: [],
        }),
        scopeInstanceId: "body",
      },
      { createId: () => ids.shift() ?? "unexpected-id" }
    );

    expect(result.result).toMatchObject({
      resourceId: "resource-id",
      dataSourceId: "data-source-id",
      warnings: [],
    });
    expect(result.payload).toContainEqual(
      expect.objectContaining({ namespace: "dataSources" })
    );
  });

  test("warns when a write resource is explicitly exposed as render data", () => {
    const state = createResourceState();
    state.instances.set("body", {
      type: "instance",
      id: "body",
      component: "Body",
      children: [],
    });
    const ids = ["resource-id", "data-source-id"];

    const result = createResource(
      state,
      {
        resource: resourceFieldsInput.parse({
          name: "Submit",
          method: "post",
          url: "https://example.com/submit",
          headers: [],
        }),
        scopeInstanceId: "body",
        exposeAsDataSource: true,
      },
      { createId: () => ids.shift() ?? "unexpected-id" }
    );

    expect(result.result).toMatchObject({
      dataSourceId: "data-source-id",
      warnings: [
        expect.objectContaining({
          code: "render_time_mutation_resource",
          path: ["resource", "method"],
          resourceId: "resource-id",
          message: expect.stringContaining("may execute while rendering"),
          remediation: expect.stringContaining("explicit action"),
        }),
      ],
    });
    expect(result.payload).toContainEqual(
      expect.objectContaining({ namespace: "dataSources" })
    );
  });

  test.each(["post", "put", "delete"] as const)(
    "does not expose scoped %s resources as render data by default",
    (method) => {
      const state = createResourceState();
      state.instances.set("body", {
        type: "instance",
        id: "body",
        component: "Body",
        children: [],
      });

      const result = createResource(
        state,
        {
          resource: resourceFieldsInput.parse({
            name: "Write action",
            method,
            url: "https://example.com/action",
            headers: [],
          }),
          scopeInstanceId: "body",
        },
        { createId: () => "resource-id" }
      );

      expect(result.result).toMatchObject({
        resourceId: "resource-id",
        dataSourceId: undefined,
        warnings: [],
      });
      expect(result.payload).not.toContainEqual(
        expect.objectContaining({ namespace: "dataSources" })
      );
    }
  );

  test("rejects render-time exposure at an unknown scope instance", () => {
    expect(() =>
      createResource(
        createResourceState(),
        {
          resource: resourceFieldsInput.parse({
            name: "Users",
            method: "get",
            url: "https://example.com/users",
            headers: [],
          }),
          scopeInstanceId: "missing",
        },
        { createId: () => "resource-id" }
      )
    ).toThrow("Scope instance not found");
  });

  test("does not invalidate resources when text replacement finds no matches", () => {
    const result = replaceResourceText(
      { resources: new Map([[resource.id, resource]]) },
      {
        find: "Not present",
        replace: "Replacement",
        match: "substring",
        fields: ["name", "url"],
        limit: 100,
      }
    );

    expect(result.payload).toEqual([]);
    expect(result.invalidatesNamespaces).toEqual([]);
    expect(result.result).toMatchObject({
      changedCount: 0,
      matchingFieldCount: 0,
    });
  });

  test("replaces selected resource names and literal URLs", () => {
    const selected: Resource = {
      ...resource,
      name: "Old users",
      url: '"https://example.com/Old-users"',
    };
    const ignored: Resource = {
      ...resource,
      id: "ignored",
      name: "Old ignored",
    };
    const result = replaceResourceText(
      {
        resources: new Map([
          [selected.id, selected],
          [ignored.id, ignored],
        ]),
      },
      {
        resourceIds: [selected.id],
        find: "Old",
        replace: "New",
        match: "substring",
        fields: ["name", "url"],
        limit: 100,
      }
    );

    expect(result.result).toMatchObject({
      changedCount: 2,
      matchingFieldCount: 2,
      truncated: false,
    });
    expect(result.payload).toEqual([
      {
        namespace: "resources",
        patches: [
          {
            op: "replace",
            path: [selected.id, "name"],
            value: "New users",
          },
          {
            op: "replace",
            path: [selected.id, "url"],
            value: '"https://example.com/New-users"',
          },
        ],
      },
    ]);
    expect(result.invalidatesNamespaces).toEqual(["resources"]);
  });

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
            path: ["box", "children", 0, "value"],
            value: encodeDataVariableId("resource-var"),
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

  test("upserts resource and preserves existing data source id", () => {
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
        { type: "expression", value: encodeDataVariableId("variable-id") },
      ],
    };

    const result = upsertResource(
      {
        pages: createDefaultPages({ rootInstanceId: "body" }),
        instances: new Map([
          [body.id, body],
          [box.id, box],
        ]),
        props: new Map(),
        dataSources: new Map<DataSource["id"], DataSource>([
          [
            "variable-id",
            {
              id: "variable-id",
              scopeInstanceId: "box",
              name: "Users",
              type: "variable",
              value: { type: "string", value: "fallback" },
            },
          ],
        ]),
        resources: new Map(),
        breakpoints: new Map(),
        styleSources: new Map(),
        styleSourceSelections: new Map(),
        styles: new Map(),
      },
      {
        scopeInstanceId: "box",
        dataSourceId: "variable-id",
        resource: resourceFieldsInput.parse({
          name: "Users",
          method: "get",
          url: "https://example.com/users",
          headers: [],
        }),
      },
      { createId: () => "resource-id" }
    );

    expect(result.result).toEqual({
      resourceId: "resource-id",
      dataSourceId: "variable-id",
    });
    expect(result.payload).toEqual([
      {
        namespace: "dataSources",
        patches: [
          {
            op: "replace",
            path: ["variable-id"],
            value: {
              id: "variable-id",
              scopeInstanceId: "box",
              name: "Users",
              type: "resource",
              resourceId: "resource-id",
            },
          },
        ],
      },
      {
        namespace: "resources",
        patches: [
          {
            op: "add",
            path: ["resource-id"],
            value: {
              id: "resource-id",
              name: "Users",
              control: undefined,
              method: "get",
              url: `"https://example.com/users"`,
              searchParams: undefined,
              headers: [],
              body: undefined,
            },
          },
        ],
      },
    ]);
  });

  test("rejects unknown explicit resource and data source ids", () => {
    const state = {
      pages: createDefaultPages({ rootInstanceId: "body" }),
      instances: new Map(),
      props: new Map(),
      dataSources: new Map(),
      resources: new Map(),
      breakpoints: new Map(),
      styleSources: new Map(),
      styleSourceSelections: new Map(),
      styles: new Map(),
    };
    const input = {
      scopeInstanceId: "box",
      resource: {
        name: "Users",
        method: "get" as const,
        url: `"https://example.com/users"`,
        headers: [],
      },
    };

    expect(() =>
      upsertResource(
        state,
        { ...input, resourceId: "missing-resource" },
        { createId: () => "id" }
      )
    ).toThrow("Resource not found");
    expect(() =>
      upsertResource(
        state,
        { ...input, dataSourceId: "missing-data-source" },
        { createId: () => "id" }
      )
    ).toThrow("Data source not found");
  });

  test("rejects invalid static resource URLs and allows dynamic URL expressions", () => {
    const state = {
      pages: createDefaultPages({ rootInstanceId: "body" }),
      instances: new Map(),
      props: new Map(),
      dataSources: new Map(),
      resources: new Map(),
      breakpoints: new Map(),
      styleSources: new Map(),
      styleSourceSelections: new Map(),
      styles: new Map(),
    };

    expect(() =>
      upsertResource(
        state,
        {
          scopeInstanceId: "box",
          resource: {
            name: "Users",
            method: "get",
            url: `""`,
            headers: [],
          },
        },
        { createId: () => "id" }
      )
    ).toThrow("url: URL is required");

    expect(() =>
      upsertResource(
        state,
        {
          scopeInstanceId: "box",
          resource: {
            name: "Users",
            method: "get",
            url: `"not-a-url"`,
            headers: [],
          },
        },
        { createId: () => "id" }
      )
    ).toThrow("url: URL is invalid");

    expect(
      upsertResource(
        state,
        {
          scopeInstanceId: "box",
          resource: {
            name: "Users",
            method: "get",
            url: `apiUrl`,
            headers: [],
          },
        },
        { createId: () => "resource-id" }
      ).result
    ).toEqual({ resourceId: "resource-id", dataSourceId: "resource-id" });
  });

  test("upserts resource and binds instance prop atomically", () => {
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
      children: [],
    };
    const ids = ["resource-id", "prop-id", "data-source-id"];
    const result = upsertResourceProp(
      {
        pages: createDefaultPages({ rootInstanceId: "body" }),
        instances: new Map([
          [body.id, body],
          [box.id, box],
        ]),
        props: new Map(),
        dataSources: new Map(),
        resources: new Map(),
        breakpoints: new Map(),
        styleSources: new Map(),
        styleSourceSelections: new Map(),
        styles: new Map(),
      },
      {
        instanceId: "box",
        propName: "data",
        resource: resourceFieldsInput.parse({
          name: "Users",
          method: "get",
          url: "https://example.com/users",
          headers: [],
        }),
      },
      { createId: () => ids.shift() ?? "extra-id" }
    );

    expect(result.result).toEqual({
      resourceId: "resource-id",
      dataSourceId: "data-source-id",
      propIds: ["prop-id"],
    });
    expect(result.payload).toContainEqual({
      namespace: "props",
      patches: [
        {
          op: "add",
          path: ["prop-id"],
          value: {
            id: "prop-id",
            instanceId: "box",
            name: "data",
            type: "resource",
            value: "resource-id",
            required: undefined,
          },
        },
      ],
    });
    expect(result.payload).toContainEqual({
      namespace: "resources",
      patches: [
        {
          op: "add",
          path: ["resource-id"],
          value: {
            id: "resource-id",
            name: "Users",
            control: undefined,
            method: "get",
            url: '"https://example.com/users"',
            searchParams: undefined,
            headers: [],
            body: undefined,
          },
        },
      ],
    });
  });

  test("rejects invalid static resource URL updates", () => {
    const state = {
      pages: createDefaultPages({ rootInstanceId: "body" }),
      instances: new Map(),
      props: new Map(),
      dataSources: new Map(),
      resources: new Map([["resource", resource]]),
      breakpoints: new Map(),
      styleSources: new Map(),
      styleSourceSelections: new Map(),
      styles: new Map(),
    };

    expect(() =>
      updateResource(
        state,
        {
          resourceId: "resource",
          values: { url: `"not-a-url"` },
        },
        { createId: () => "unused-id" }
      )
    ).toThrow("url: URL is invalid");

    expect(
      updateResource(
        state,
        {
          resourceId: "resource",
          values: resourceFieldsUpdateInput.parse({
            headers: [
              {
                name: "Content-Type",
                value: { type: "literal", value: "application/json" },
              },
            ],
            body: { type: "literal", value: "Plain text body" },
          }),
        },
        { createId: () => "unused-id" }
      ).payload
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          namespace: "resources",
          patches: expect.arrayContaining([
            expect.objectContaining({
              value: expect.objectContaining({
                headers: [
                  { name: "Content-Type", value: '"application/json"' },
                ],
                body: '"Plain text body"',
              }),
            }),
          ]),
        }),
      ])
    );
  });

  test("preserves omitted resource fields during partial updates", () => {
    const state = createResourceState();
    state.resources.set("resource", {
      ...resource,
      headers: [{ name: "Authorization", value: '"Bearer token"' }],
      body: '"request body"',
    });

    const result = updateResource(
      state,
      {
        resourceId: "resource",
        values: { name: "Renamed" },
      },
      { createId: () => "unused-id" }
    );
    const resourcePatch = result.payload
      .find(({ namespace }) => namespace === "resources")
      ?.patches.find(({ path }) => path[0] === "resource");

    expect(resourcePatch).toMatchObject({
      value: {
        name: "Renamed",
        headers: [{ name: "Authorization", value: '"Bearer token"' }],
        body: '"request body"',
      },
    });
  });

  test("keeps an empty resource update as a no-op", () => {
    const state = createResourceState();
    state.resources.set("resource", resource);

    const result = updateResource(
      state,
      { resourceId: "resource", values: {} },
      { createId: () => "unused-id" }
    );

    expect(result).toMatchObject({
      payload: [],
      noop: true,
      invalidatesNamespaces: [],
      result: { resourceId: "resource" },
    });
  });

  test("detaches render data when a resource becomes a write action", () => {
    const state = createResourceState();
    state.instances.set("body", {
      type: "instance",
      id: "body",
      component: "Body",
      children: [],
    });
    state.resources.set("resource", resource);
    state.dataSources.set("data-source", {
      id: "data-source",
      scopeInstanceId: "body",
      name: "Users",
      type: "resource",
      resourceId: "resource",
    });

    const result = updateResource(
      state,
      {
        resourceId: "resource",
        values: { method: "post" },
      },
      { createId: () => "unused-id" }
    );

    expect(result.result).toMatchObject({
      resourceId: "resource",
      dataSourceId: undefined,
      warnings: [],
    });
    expect(result.payload).toContainEqual({
      namespace: "dataSources",
      patches: [{ op: "remove", path: ["data-source"] }],
    });
  });

  test("preserves explicit write-resource exposure during unrelated updates", () => {
    const state = createResourceState();
    state.instances.set("body", {
      type: "instance",
      id: "body",
      component: "Body",
      children: [],
    });
    state.resources.set("resource", { ...resource, method: "post" });
    state.dataSources.set("data-source", {
      id: "data-source",
      scopeInstanceId: "body",
      name: "Users",
      type: "resource",
      resourceId: "resource",
    });

    const result = updateResource(
      state,
      {
        resourceId: "resource",
        values: { name: "Renamed" },
      },
      { createId: () => "unused-id" }
    );

    expect(result.result).toMatchObject({
      resourceId: "resource",
      dataSourceId: "data-source",
      warnings: [
        expect.objectContaining({
          code: "render_time_mutation_resource",
          resourceId: "resource",
        }),
      ],
    });
    expect(result.payload).not.toContainEqual({
      namespace: "dataSources",
      patches: [{ op: "remove", path: ["data-source"] }],
    });
  });

  test("reports updated resource expression warnings at input paths", () => {
    const state = createResourceState();
    state.resources.set("resource", resource);

    const result = updateResource(
      state,
      {
        resourceId: "resource",
        values: { body: "missingPayload" },
      },
      { createId: () => "unused-id" }
    );

    expect(result.result).toMatchObject({
      warnings: [
        expect.objectContaining({
          code: "expression_lint_warning",
          path: ["values", "body"],
          resourceId: "resource",
        }),
      ],
    });
  });

  test("can explicitly attach and detach render data on update", () => {
    const state = createResourceState();
    state.instances.set("body", {
      type: "instance",
      id: "body",
      component: "Body",
      children: [],
    });
    state.resources.set("resource", { ...resource, method: "post" });

    const attached = updateResource(
      state,
      {
        resourceId: "resource",
        values: {},
        scopeInstanceId: "body",
        exposeAsDataSource: true,
      },
      { createId: () => "data-source" }
    );

    expect(attached.result).toMatchObject({
      dataSourceId: "data-source",
      warnings: [
        expect.objectContaining({
          code: "render_time_mutation_resource",
          path: ["values", "method"],
          resourceId: "resource",
          message: expect.stringContaining("may execute while rendering"),
          remediation: expect.stringContaining("explicit action"),
        }),
      ],
    });
    expect(attached.payload).toContainEqual(
      expect.objectContaining({ namespace: "dataSources" })
    );

    const attachedState = createResourceState();
    attachedState.instances.set("body", state.instances.get("body")!);
    attachedState.resources.set("resource", { ...resource, method: "post" });
    attachedState.dataSources.set("data-source", {
      id: "data-source",
      scopeInstanceId: "body",
      name: "Users",
      type: "resource",
      resourceId: "resource",
    });
    const detached = updateResource(
      attachedState,
      {
        resourceId: "resource",
        values: {},
        exposeAsDataSource: false,
      },
      { createId: () => "unused-id" }
    );

    expect(detached.payload).toContainEqual({
      namespace: "dataSources",
      patches: [{ op: "remove", path: ["data-source"] }],
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

describe("resource expression form validation", () => {
  const scope = {
    [encodeDataVariableId("apiUrl")]: "https://example.com/users",
    [encodeDataVariableId("emptyUrl")]: "",
    [encodeDataVariableId("bodyText")]: "hello",
    [encodeDataVariableId("bodyJson")]: { ok: true },
  };

  test("computes expressions against encoded variable scope names", () => {
    expect(computeExpressionWithinScope("apiUrl", scope)).toBe(
      "https://example.com/users"
    );
    expect(computeExpressionWithinScope("   ", scope)).toBeUndefined();
  });

  test("validates evaluated resource urls", () => {
    expect(validateResourceUrlExpression("apiUrl", scope)).toBe("");
    expect(validateResourceUrlExpression("bodyJson", scope)).toBe(
      "URL expects a string"
    );
    expect(validateResourceUrlExpression("emptyUrl", scope)).toBe(
      "URL is required"
    );
    expect(validateResourceUrlExpression('"not a url"', scope)).toBe(
      "URL is invalid"
    );
  });

  test("validates evaluated resource body by body type", () => {
    expect(validateResourceBodyExpression("", "json", scope)).toBe("");
    expect(validateResourceBodyExpression("bodyJson", "json", scope)).toBe("");
    expect(validateResourceBodyExpression("bodyText", "json", scope)).toBe(
      "Expected valid JSON object in body"
    );
    expect(validateResourceBodyExpression("bodyText", "text", scope)).toBe("");
    expect(validateResourceBodyExpression("bodyJson", "text", scope)).toBe(
      "Expected string in body"
    );
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
