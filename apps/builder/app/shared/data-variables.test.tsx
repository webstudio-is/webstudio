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
import { createDefaultPages } from "@webstudio-is/project-build";
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

test("unset global variables on all pages when delete", () => {
  const globalVariable = new Variable("globalVariable", "");
  const pages = createDefaultPages({ rootInstanceId: "homeBodyId" });
  pages.pages.push({
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
  data.pages.homePage.title = bodyIdentifier;
  data.pages.homePage.meta = {
    description: bodyIdentifier,
    excludePageFromSearch: bodyIdentifier,
    socialImageUrl: bodyIdentifier,
    language: bodyIdentifier,
    status: bodyIdentifier,
    redirect: bodyIdentifier,
    custom: [{ property: "auth", content: bodyIdentifier }],
  };
  deleteVariableMutable(data, bodyVariableId);
  expect(data.pages.homePage.title).toEqual(`bodyVariable`);
  expect(data.pages.homePage.meta.description).toEqual(`bodyVariable`);
  expect(data.pages.homePage.meta.excludePageFromSearch).toEqual(
    `bodyVariable`
  );
  expect(data.pages.homePage.meta.socialImageUrl).toEqual(`bodyVariable`);
  expect(data.pages.homePage.meta.language).toEqual(`bodyVariable`);
  expect(data.pages.homePage.meta.status).toEqual(`bodyVariable`);
  expect(data.pages.homePage.meta.redirect).toEqual(`bodyVariable`);
  expect(data.pages.homePage.meta.custom?.[0].content).toEqual(`bodyVariable`);
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
  data.pages.pages.push({
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
  for (const page of [data.pages.homePage, ...data.pages.pages]) {
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
  for (const page of [data.pages.homePage, ...data.pages.pages]) {
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
