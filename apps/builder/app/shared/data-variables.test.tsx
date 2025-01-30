import { expect, test, vi } from "vitest";
import {
  computeExpression,
  decodeDataVariableName,
  encodeDataVariableName,
  finaUnsetVariableNames,
  restoreExpressionVariables,
  restoreTreeVariablesMutable,
  unsetExpressionVariables,
} from "./data-variables";
import {
  $,
  ActionValue,
  expression,
  renderData,
  ResourceValue,
  Variable,
} from "@webstudio-is/template";
import type { InstancePath } from "./awareness";
import type { Instances } from "@webstudio-is/sdk";

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

const getInstancePath = (
  instances: Instances,
  instanceSelector: string[]
): InstancePath => {
  const instancePath: InstancePath = [];
  for (let index = 0; index < instanceSelector.length; index += 1) {
    const instanceId = instanceSelector[index];
    const instance = instances.get(instanceId);
    if (instance) {
      instancePath.push({
        instance,
        instanceSelector: instanceSelector.slice(index),
      });
    }
  }
  return instancePath;
};

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
    finaUnsetVariableNames({
      instancePath: getInstancePath(data.instances, ["body"]),
      ...data,
    })
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
  const oneBody = new Variable("one", "one value of body");
  const oneBox = new Variable("one", "one value of box");
  const data = renderData(
    <$.Body ws:id="body" data-variables={expression`${oneBody}`}>
      <$.Box ws:id="box" data-variables={expression`${oneBox}`}>
        <$.Text ws:id="text">{expression`one`}</$.Text>
      </$.Box>
    </$.Body>
  );
  restoreTreeVariablesMutable({
    instancePath: getInstancePath(data.instances, ["box", "body"]),
    ...data,
  });
  expect(data.dataSources.get("1")).toEqual(
    expect.objectContaining({ name: "one", scopeInstanceId: "box" })
  );
  expect(data.instances.get("text")?.children).toEqual([
    { type: "expression", value: "$ws$dataSource$1" },
  ]);
});

test("restore tree variables in props", () => {
  const oneBody = new Variable("one", "one value of body");
  const oneBox = new Variable("one", "one value of box");
  const twoBox = new Variable("two", "two value of box");
  const data = renderData(
    <$.Body ws:id="body" data-variables={expression`${oneBody}`}>
      <$.Box
        ws:id="box"
        data-variables={expression`${oneBox} ${twoBox}`}
        data-one={expression`one`}
        data-action={new ActionValue(["one"], expression`one + two + three`)}
      >
        <$.Text ws:id="text" data-two={expression`one + two + three`}></$.Text>
      </$.Box>
    </$.Body>
  );
  restoreTreeVariablesMutable({
    instancePath: getInstancePath(data.instances, ["box", "body"]),
    ...data,
  });
  expect(data.dataSources.get("1")).toEqual(
    expect.objectContaining({ name: "one", scopeInstanceId: "box" })
  );
  expect(data.dataSources.get("2")).toEqual(
    expect.objectContaining({ name: "two", scopeInstanceId: "box" })
  );
  expect(data.props.get("box:data-one")?.value).toEqual("$ws$dataSource$1");
  expect(data.props.get("text:data-two")?.value).toEqual(
    "$ws$dataSource$1 + $ws$dataSource$2 + three"
  );
  expect(data.props.get("box:data-action")?.value).toEqual([
    { type: "execute", args: ["one"], code: "one + $ws$dataSource$2 + three" },
  ]);
});

test("restore tree variables in resources", () => {
  const oneBody = new Variable("one", "one value of body");
  const oneBox = new Variable("one", "one value of box");
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
    <$.Body ws:id="body" data-variables={expression`${oneBody}`}>
      <$.Box ws:id="box" data-variables={expression`${oneBox}`}>
        <$.Text
          ws:id="text"
          data-variables={expression`${resourceVariable}`}
          data-resource={resourceProp}
        ></$.Text>
      </$.Box>
    </$.Body>
  );
  restoreTreeVariablesMutable({
    instancePath: getInstancePath(data.instances, ["box", "body"]),
    ...data,
  });
  expect(data.dataSources.get("1")).toEqual(
    expect.objectContaining({ name: "one", scopeInstanceId: "box" })
  );
  expect(data.props.get("text:data-variables")?.value).toEqual(
    `$ws$dataSource$2`
  );
  expect(data.dataSources.get("2")).toEqual(
    expect.objectContaining({
      name: "resourceVariable",
      scopeInstanceId: "text",
      resourceId: "resource:2",
    })
  );
  expect(data.resources.get("resource:2")).toEqual({
    id: "resource:2",
    name: "resourceVariable",
    url: "$ws$dataSource$1 + 1",
    method: "post",
    headers: [{ name: "auth", value: "$ws$dataSource$1 + 1" }],
    body: "$ws$dataSource$1 + 1",
  });
  expect(data.props.get("text:data-resource")?.value).toEqual(`resource:3`);
  expect(data.resources.get("resource:3")).toEqual({
    id: "resource:3",
    name: "resourceProp",
    url: "$ws$dataSource$1 + 2",
    method: "post",
    headers: [{ name: "auth", value: "$ws$dataSource$1 + 2" }],
    body: "$ws$dataSource$1 + 2",
  });
});
