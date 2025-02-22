import { expect, test, vi } from "vitest";
import {
  $,
  ActionValue,
  expression,
  renderData,
  ResourceValue,
  Variable,
  ws,
} from "@webstudio-is/template";
import {
  encodeDataVariableId,
  ROOT_INSTANCE_ID,
  SYSTEM_VARIABLE_ID,
} from "@webstudio-is/sdk";
import {
  computeExpression,
  decodeDataVariableName,
  encodeDataVariableName,
  findUnsetVariableNames,
  restoreExpressionVariables,
  rebindTreeVariablesMutable,
  unsetExpressionVariables,
  deleteVariableMutable,
  findAvailableVariables,
} from "./data-variables";

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
  // prevent error message in test report
  const spy = vi.spyOn(console, "error");
  spy.mockImplementationOnce(() => {});
  expect(computeExpression("https://github.com", new Map())).toEqual(undefined);
  expect(spy).toHaveBeenCalledOnce();
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

test("compute unset variables as undefined", () => {
  expect(computeExpression(`a`, new Map())).toEqual(undefined);
  expect(computeExpression("`${a}`", new Map())).toEqual("undefined");
});

test("find unset variable names", () => {
  const resourceVariable = new ResourceValue("resourceVariable", {
    url: expression`six`,
    method: "post",
    headers: [{ name: "auth", value: expression`seven` }],
    body: expression`eight`,
  });
  const resourceProp = new ResourceValue("resourceProp", {
    url: expression`nine`,
    method: "post",
    headers: [{ name: "auth", value: expression`ten` }],
    body: expression`eleven`,
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
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
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
  rebindTreeVariablesMutable({ startingInstanceId: "boxId", ...data });
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
  rebindTreeVariablesMutable({ startingInstanceId: "boxId", ...data });
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
  rebindTreeVariablesMutable({ startingInstanceId: "boxId", ...data });
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

test("restore tree variables in resources", () => {
  const bodyVariable = new Variable("one", "one value of body");
  const boxVariable = new Variable("one", "one value of box");
  const resourceVariable = new ResourceValue("resourceVariable", {
    url: expression`one + 1`,
    method: "post",
    headers: [{ name: "auth", value: expression`one + 1` }],
    body: expression`one + 1`,
  });
  const resourceProp = new ResourceValue("resourceProp", {
    url: expression`one + 2`,
    method: "post",
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
  rebindTreeVariablesMutable({ startingInstanceId: "boxId", ...data });
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
      headers: [{ name: "auth", value: `${boxIdentifier} + 1` }],
      body: `${boxIdentifier} + 1`,
    }),
    expect.objectContaining({
      url: `${boxIdentifier} + 2`,
      method: "post",
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
    headers: [{ name: "auth", value: expression`${bodyVariable}` }],
    body: expression`${bodyVariable}`,
  });
  const resourceProp = new ResourceValue("resourceProp", {
    url: expression`${bodyVariable}`,
    method: "post",
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
  rebindTreeVariablesMutable({ startingInstanceId: "boxId", ...data });
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
      headers: [{ name: "auth", value: boxIdentifier }],
      body: boxIdentifier,
    }),
    expect.objectContaining({
      url: boxIdentifier,
      method: "post",
      headers: [{ name: "auth", value: boxIdentifier }],
      body: boxIdentifier,
    }),
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
  rebindTreeVariablesMutable({ startingInstanceId: "boxId", ...data });
  expect(data.instances.get("boxId")?.children).toEqual([
    { type: "expression", value: "myVariable" },
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

test("delete variable and unset it in resources", () => {
  const bodyVariable = new Variable("bodyVariable", "one value of body");
  const resourceVariable = new ResourceValue("resourceVariable", {
    url: expression`${bodyVariable}`,
    method: "post",
    headers: [{ name: "auth", value: expression`${bodyVariable}` }],
    body: expression`${bodyVariable}`,
  });
  const resourceProp = new ResourceValue("resourceProp", {
    url: expression`${bodyVariable}`,
    method: "post",
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
      headers: [{ name: "auth", value: "bodyVariable" }],
      body: "bodyVariable",
    }),
    expect.objectContaining({
      url: "bodyVariable",
      method: "post",
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
