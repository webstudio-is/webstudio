import { expect, test } from "vitest";
import { showAttribute } from "@webstudio-is/react-sdk";
import {
  $,
  ActionValue,
  AssetValue,
  expression,
  PageValue,
  Parameter,
  PlaceholderValue,
  renderTemplate,
  ResourceValue,
  Variable,
} from "./jsx";
import { css } from "./css";

test("render jsx into instances with generated id", () => {
  const { instances } = renderTemplate(
    <$.Body>
      <$.Box></$.Box>
      <$.Box></$.Box>
    </$.Body>
  );
  expect(instances).toEqual([
    {
      type: "instance",
      id: "0",
      component: "Body",
      children: [
        { type: "id", value: "1" },
        { type: "id", value: "2" },
      ],
    },
    {
      type: "instance",
      id: "1",
      component: "Box",
      children: [],
    },
    {
      type: "instance",
      id: "2",
      component: "Box",
      children: [],
    },
  ]);
});

test("override generated ids with ws:id prop", () => {
  const { instances } = renderTemplate(
    <$.Body ws:id="custom1">
      <$.Box ws:id="custom2">
        <$.Span ws:id="custom3"></$.Span>
      </$.Box>
    </$.Body>
  );
  expect(instances).toEqual([
    {
      type: "instance",
      id: "custom1",
      component: "Body",
      children: [{ type: "id", value: "custom2" }],
    },
    {
      type: "instance",
      id: "custom2",
      component: "Box",
      children: [{ type: "id", value: "custom3" }],
    },
    {
      type: "instance",
      id: "custom3",
      component: "Span",
      children: [],
    },
  ]);
});

test("render text children", () => {
  const { instances } = renderTemplate(<$.Body>children</$.Body>);
  expect(instances).toEqual([
    {
      type: "instance",
      id: "0",
      component: "Body",
      children: [{ type: "text", value: "children" }],
    },
  ]);
});

test("render template children with top level instance", () => {
  const { children } = renderTemplate(<$.Box></$.Box>);
  expect(children).toEqual([{ type: "id", value: "0" }]);
});

test("render template children with multiple instances from fragment", () => {
  const { children, instances } = renderTemplate(
    <>
      <$.Box></$.Box>
      <$.Text></$.Text>
      <$.Button></$.Button>
    </>
  );
  expect(children).toEqual([
    { type: "id", value: "0" },
    { type: "id", value: "1" },
    { type: "id", value: "2" },
  ]);
  expect(instances).toEqual([
    { type: "instance", id: "0", component: "Box", children: [] },
    { type: "instance", id: "1", component: "Text", children: [] },
    { type: "instance", id: "2", component: "Button", children: [] },
  ]);
});

test("render literal props", () => {
  const { props } = renderTemplate(
    <$.Body data-string="string" data-number={0}>
      <$.Box data-bool={true} data-json={{ param: "value" }}></$.Box>
    </$.Body>
  );
  expect(props).toEqual([
    {
      id: "0:data-string",
      instanceId: "0",
      name: "data-string",
      type: "string",
      value: "string",
    },
    {
      id: "0:data-number",
      instanceId: "0",
      name: "data-number",
      type: "number",
      value: 0,
    },
    {
      id: "1:data-bool",
      instanceId: "1",
      name: "data-bool",
      type: "boolean",
      value: true,
    },
    {
      id: "1:data-json",
      instanceId: "1",
      name: "data-json",
      type: "json",
      value: { param: "value" },
    },
  ]);
});

test("render defined props", () => {
  const { props } = renderTemplate(
    <$.Body>
      <$.Box
        data-asset={new AssetValue("assetId")}
        data-page={new PageValue("pageId")}
        data-instance={new PageValue("pageId", "instanceId")}
      ></$.Box>
    </$.Body>
  );
  expect(props).toEqual([
    {
      id: "1:data-asset",
      instanceId: "1",
      name: "data-asset",
      type: "asset",
      value: "assetId",
    },
    {
      id: "1:data-page",
      instanceId: "1",
      name: "data-page",
      type: "page",
      value: "pageId",
    },
    {
      id: "1:data-instance",
      instanceId: "1",
      name: "data-instance",
      type: "page",
      value: { pageId: "pageId", instanceId: "instanceId" },
    },
  ]);
});

test("render placeholder value", () => {
  const { instances } = renderTemplate(
    <$.Body>{new PlaceholderValue("Placeholder text")}</$.Body>
  );
  expect(instances).toEqual([
    {
      type: "instance",
      id: "0",
      component: "Body",
      children: [
        { type: "text", value: "Placeholder text", placeholder: true },
      ],
    },
  ]);
});

test("generate local styles", () => {
  const { breakpoints, styleSources, styleSourceSelections, styles } =
    renderTemplate(
      <$.Body
        ws:style={css`
          color: red;
        `}
      >
        <$.Box
          ws:style={css`
            font-size: 10px;
          `}
        ></$.Box>
      </$.Body>
    );
  expect(breakpoints).toEqual([{ id: "base", label: "" }]);
  expect(styleSources).toEqual([
    { id: "0:ws:style", type: "local" },
    { id: "1:ws:style", type: "local" },
  ]);
  expect(styleSourceSelections).toEqual([
    { instanceId: "0", values: ["0:ws:style"] },
    { instanceId: "1", values: ["1:ws:style"] },
  ]);
  expect(styles).toEqual([
    {
      breakpointId: "base",
      styleSourceId: "0:ws:style",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
    {
      breakpointId: "base",
      styleSourceId: "1:ws:style",
      property: "fontSize",
      value: { type: "unit", unit: "px", value: 10 },
    },
  ]);
});

test("generate local styles with states", () => {
  const { styles } = renderTemplate(
    <$.Body
      ws:style={css`
        color: red;
        &:hover {
          color: blue;
        }
      `}
    ></$.Body>
  );
  expect(styles).toEqual([
    {
      breakpointId: "base",
      styleSourceId: "0:ws:style",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
    {
      breakpointId: "base",
      styleSourceId: "0:ws:style",
      state: ":hover",
      property: "color",
      value: { type: "keyword", value: "blue" },
    },
  ]);
});

test("avoid generating style data without styles", () => {
  const { breakpoints, styleSources, styleSourceSelections, styles } =
    renderTemplate(<$.Body></$.Body>);
  expect(breakpoints).toEqual([]);
  expect(styleSources).toEqual([]);
  expect(styleSourceSelections).toEqual([]);
  expect(styles).toEqual([]);
});

test("render variable used in prop expression", () => {
  const count = new Variable("count", 1);
  const { props, dataSources } = renderTemplate(
    <$.Body ws:id="body" data-count={expression`${count}`}></$.Body>
  );
  expect(props).toEqual([
    {
      id: "body:data-count",
      instanceId: "body",
      name: "data-count",
      type: "expression",
      value: "$ws$dataSource$0",
    },
  ]);
  expect(dataSources).toEqual([
    {
      type: "variable",
      id: "0",
      scopeInstanceId: "body",
      name: "count",
      value: { type: "number", value: 1 },
    },
  ]);
});

test("render variable used in child expression", () => {
  const count = new Variable("count", 1);
  const { instances, dataSources } = renderTemplate(
    <$.Body ws:id="body">{expression`${count}`}</$.Body>
  );
  expect(instances).toEqual([
    {
      type: "instance",
      id: "body",
      component: "Body",
      children: [{ type: "expression", value: "$ws$dataSource$0" }],
    },
  ]);
  expect(dataSources).toEqual([
    {
      type: "variable",
      id: "0",
      scopeInstanceId: "body",
      name: "count",
      value: { type: "number", value: 1 },
    },
  ]);
});

test("compose expression from multiple variables", () => {
  const count = new Variable("count", 1);
  const step = new Variable("step", 2);
  const { props, dataSources } = renderTemplate(
    <$.Body
      ws:id="body"
      data-count={expression`Count is ${count} + ${step}`}
    ></$.Body>
  );
  expect(props).toEqual([
    {
      id: "body:data-count",
      instanceId: "body",
      name: "data-count",
      type: "expression",
      value: "Count is $ws$dataSource$0 + $ws$dataSource$1",
    },
  ]);
  expect(dataSources).toEqual([
    {
      type: "variable",
      id: "0",
      scopeInstanceId: "body",
      name: "count",
      value: { type: "number", value: 1 },
    },
    {
      type: "variable",
      id: "1",
      scopeInstanceId: "body",
      name: "step",
      value: { type: "number", value: 2 },
    },
  ]);
});

test("preserve same variable on multiple instances", () => {
  const count = new Variable("count", 1);
  const { props, dataSources } = renderTemplate(
    <$.Body ws:id="body" data-count={expression`${count}`}>
      <$.Box ws:id="box" data-count={expression`${count}`}></$.Box>
    </$.Body>
  );
  expect(props).toEqual([
    {
      id: "body:data-count",
      instanceId: "body",
      name: "data-count",
      type: "expression",
      value: "$ws$dataSource$0",
    },
    {
      id: "box:data-count",
      instanceId: "box",
      name: "data-count",
      type: "expression",
      value: "$ws$dataSource$0",
    },
  ]);
  expect(dataSources).toEqual([
    {
      type: "variable",
      id: "0",
      scopeInstanceId: "body",
      name: "count",
      value: { type: "number", value: 1 },
    },
  ]);
});

test("render variable inside of action", () => {
  const count = new Variable("count", 1);
  const { props, dataSources } = renderTemplate(
    <$.Body
      ws:id="body"
      data-count={expression`${count}`}
      onInc={new ActionValue(["step"], expression`${count} = ${count} + step`)}
    ></$.Body>
  );
  expect(props).toEqual([
    {
      id: "body:data-count",
      instanceId: "body",
      name: "data-count",
      type: "expression",
      value: "$ws$dataSource$0",
    },
    {
      id: "body:onInc",
      instanceId: "body",
      name: "onInc",
      type: "action",
      value: [
        {
          type: "execute",
          args: ["step"],
          code: "$ws$dataSource$0 = $ws$dataSource$0 + step",
        },
      ],
    },
  ]);
  expect(dataSources).toEqual([
    {
      type: "variable",
      id: "0",
      scopeInstanceId: "body",
      name: "count",
      value: { type: "number", value: 1 },
    },
  ]);
});

test("render parameter bound to prop expression", () => {
  const system = new Parameter("system");
  const { props, dataSources } = renderTemplate(
    <$.Body
      ws:id="body"
      data-param={system}
      data-value={expression`${system}`}
    ></$.Body>
  );
  expect(props).toEqual([
    {
      id: "body:data-param",
      instanceId: "body",
      name: "data-param",
      type: "parameter",
      value: "0",
    },
    {
      id: "body:data-value",
      instanceId: "body",
      name: "data-value",
      type: "expression",
      value: "$ws$dataSource$0",
    },
  ]);
  expect(dataSources).toEqual([
    {
      type: "parameter",
      id: "0",
      scopeInstanceId: "body",
      name: "system",
    },
  ]);
});

test("render resource variable", () => {
  const value = new Variable("value", "value");
  const myResource = new ResourceValue("myResource", {
    url: expression`"https://my-url.com/" + ${value}`,
    method: "get",
    headers: [{ name: "auth", value: expression`${value}` }],
    body: expression`${value}`,
  });
  const { dataSources, resources } = renderTemplate(
    <$.Body ws:id="body">{expression`${myResource}.title`}</$.Body>
  );
  expect(dataSources).toEqual([
    {
      id: "1",
      name: "value",
      scopeInstanceId: "body",
      type: "variable",
      value: { type: "string", value: "value" },
    },
    {
      id: "0",
      scopeInstanceId: "body",
      name: "myResource",
      type: "resource",
      resourceId: "resource:0",
    },
  ]);
  expect(resources).toEqual([
    {
      id: "resource:0",
      name: "myResource",
      url: `"https://my-url.com/" + $ws$dataSource$1`,
      method: "get",
      headers: [{ name: "auth", value: `$ws$dataSource$1` }],
      body: `$ws$dataSource$1`,
    },
  ]);
});

test("render resource prop", () => {
  const value = new Variable("value", "value");
  const myResource = new ResourceValue("myResource", {
    url: expression`"https://my-url.com/" + ${value}`,
    method: "get",
    headers: [{ name: "auth", value: expression`${value}` }],
    body: expression`${value}`,
  });
  const { props, dataSources, resources } = renderTemplate(
    <$.Body ws:id="body" action={myResource}></$.Body>
  );
  expect(props).toEqual([
    {
      id: "body:action",
      instanceId: "body",
      name: "action",
      type: "resource",
      value: "resource:0",
    },
  ]);
  expect(dataSources).toEqual([
    {
      id: "1",
      name: "value",
      scopeInstanceId: "body",
      type: "variable",
      value: { type: "string", value: "value" },
    },
  ]);
  expect(resources).toEqual([
    {
      id: "resource:0",
      name: "myResource",
      url: `"https://my-url.com/" + $ws$dataSource$1`,
      method: "get",
      headers: [{ name: "auth", value: `$ws$dataSource$1` }],
      body: `$ws$dataSource$1`,
    },
  ]);
});

test("render ws:show attribute", () => {
  const { props } = renderTemplate(
    <$.Body ws:id="body" ws:show={true}></$.Body>
  );
  expect(props).toEqual([
    {
      id: "body:data-ws-show",
      instanceId: "body",
      name: showAttribute,
      type: "boolean",
      value: true,
    },
  ]);
});
