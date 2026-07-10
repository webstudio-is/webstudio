import { expect, test } from "vitest";
import { showAttribute } from "@webstudio-is/react-sdk";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import {
  $,
  ActionValue,
  AssetValue,
  createProxy,
  expression,
  PageValue,
  Parameter,
  PlaceholderValue,
  renderTemplate,
  ResourceValue,
  token,
  Variable,
  ws,
} from "./jsx";
import { css } from "./css";

const animationActionPropMeta = {
  required: false,
  control: "animationAction",
  type: "animationAction",
} satisfies NonNullable<WsComponentMeta["props"]>[string];

const viewAnimationAction = {
  type: "view",
  animations: [
    {
      timing: {
        fill: "backwards",
        rangeStart: ["entry", { type: "unit", value: 0, unit: "%" }],
        rangeEnd: ["entry", { type: "unit", value: 100, unit: "%" }],
      },
      keyframes: [
        {
          styles: {
            opacity: { type: "unit", value: 0, unit: "number" },
          },
        },
      ],
    },
  ],
} as const;

const animation = createProxy("@webstudio-is/sdk-components-animation:");

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

test("uses component metas to convert animation action props", () => {
  const { props } = renderTemplate(
    <animation.AnimateChildren
      action={viewAnimationAction}
    ></animation.AnimateChildren>,
    undefined,
    [],
    {
      componentMetas: new Map([
        [
          "@webstudio-is/sdk-components-animation:AnimateChildren",
          {
            props: {
              action: animationActionPropMeta,
            },
          },
        ],
      ]),
    }
  );

  expect(props).toEqual([
    {
      id: "0:action",
      instanceId: "0",
      name: "action",
      type: "animationAction",
      value: viewAnimationAction,
    },
  ]);
});

test("reports invalid animation action props from component metas", () => {
  expect(() =>
    renderTemplate(
      <animation.AnimateChildren action="fade"></animation.AnimateChildren>,
      undefined,
      [],
      {
        componentMetas: new Map([
          [
            "@webstudio-is/sdk-components-animation:AnimateChildren",
            {
              props: {
                action: animationActionPropMeta,
              },
            },
          ],
        ]),
      }
    )
  ).toThrow(
    'Invalid JSX prop "action". Expected animationAction for @webstudio-is/sdk-components-animation:AnimateChildren.action.'
  );
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

test("rejects nested react fragments", () => {
  expect(() =>
    renderTemplate(
      <$.Body>
        <>
          <$.Box></$.Box>
        </>
      </$.Body>
    )
  ).toThrow(
    "Do not use React fragment shorthand <>...</> inside Webstudio JSX"
  );
});

test("rejects raw html tags", () => {
  expect(() => renderTemplate(<div>Hello</div>)).toThrow(
    "Do not use raw HTML tag <div> in Webstudio JSX"
  );
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

test("validates json-compatible prop values", () => {
  expect(() => renderTemplate(<$.Body data-value={NaN}></$.Body>)).toThrow(
    'Invalid JSX prop "data-value". Do not pass NaN or Infinity. Use a finite number instead.'
  );
  expect(() =>
    renderTemplate(<$.Body data-value={new Date(0)}></$.Body>)
  ).toThrow(
    'Invalid JSX prop "data-value". Do not pass Date objects. Use plain JSON-compatible values instead.'
  );
  expect(() =>
    renderTemplate(
      <$.Body data-config={{ values: [1, Symbol("bad")] }}></$.Body>
    )
  ).toThrow(
    'Invalid JSX prop "data-config" at "values.1". Do not pass Symbol values. Use a string, finite number, or expression instead.'
  );
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

test("validates local style input", () => {
  expect(() =>
    renderTemplate(<$.Body ws:style={"color: red;" as never}></$.Body>)
  ).toThrow("ws:style must come from css`...`");
  expect(() =>
    renderTemplate(<$.Body ws:style={[] as never}></$.Body>)
  ).toThrow("ws:style must include at least one valid CSS declaration");
  expect(() => renderTemplate(<$.Body ws:style={css``}></$.Body>)).toThrow(
    "ws:style must include at least one valid CSS declaration"
  );
});

test("generates local styles from react style object", () => {
  const { props, styleSources, styleSourceSelections, styles } = renderTemplate(
    <$.Body
      style={{
        color: "red",
        padding: 24,
        opacity: 0.5,
      }}
    ></$.Body>
  );
  expect(props).toEqual([]);
  expect(styleSources).toEqual([{ id: "0:ws:style", type: "local" }]);
  expect(styleSourceSelections).toEqual([
    { instanceId: "0", values: ["0:ws:style"] },
  ]);
  expect(styles).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        breakpointId: "base",
        styleSourceId: "0:ws:style",
        property: "color",
        value: { type: "keyword", value: "red" },
      }),
      expect.objectContaining({
        breakpointId: "base",
        styleSourceId: "0:ws:style",
        property: "paddingTop",
        value: { type: "unit", unit: "px", value: 24 },
      }),
      expect.objectContaining({
        breakpointId: "base",
        styleSourceId: "0:ws:style",
        property: "paddingRight",
        value: { type: "unit", unit: "px", value: 24 },
      }),
      expect.objectContaining({
        breakpointId: "base",
        styleSourceId: "0:ws:style",
        property: "paddingBottom",
        value: { type: "unit", unit: "px", value: 24 },
      }),
      expect.objectContaining({
        breakpointId: "base",
        styleSourceId: "0:ws:style",
        property: "paddingLeft",
        value: { type: "unit", unit: "px", value: 24 },
      }),
      expect.objectContaining({
        breakpointId: "base",
        styleSourceId: "0:ws:style",
        property: "opacity",
        value: { type: "unit", unit: "number", value: 0.5 },
      }),
    ])
  );
  expect(styles).toHaveLength(6);
});

test("validates react style object input", () => {
  expect(() =>
    renderTemplate(<$.Body style={"color: red;" as never}></$.Body>)
  ).toThrow("style prop must be a plain object");
  expect(() =>
    renderTemplate(<$.Body style={{ padding: Number.NaN }}></$.Body>)
  ).toThrow('Invalid style prop "padding"');
  expect(() =>
    renderTemplate(<$.Body style={{ color: false as never }}></$.Body>)
  ).toThrow('Invalid style prop "color"');
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

test("generate token styles", () => {
  const { breakpoints, styleSources, styleSourceSelections, styles } =
    renderTemplate(
      <$.Body
        ws:id="body"
        ws:tokens={[
          token(
            "primary",
            css`
              color: red;
            `
          ),
        ]}
      ></$.Body>
    );
  expect(breakpoints).toEqual([{ id: "base", label: "" }]);
  expect(styleSources).toEqual([{ id: "0", type: "token", name: "primary" }]);
  expect(styleSourceSelections).toEqual([
    { instanceId: "body", values: ["0"] },
  ]);
  expect(styles).toEqual([
    {
      breakpointId: "base",
      styleSourceId: "0",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ]);
});

test("validates token helper input", () => {
  expect(() =>
    renderTemplate(
      <$.Body
        ws:tokens={[
          token(
            "primary",
            "color: red;" as unknown as Parameters<typeof token>[1]
          ),
        ]}
      ></$.Body>
    )
  ).toThrow("token() styles must come from css`...`");
  expect(() =>
    renderTemplate(
      <$.Body
        ws:tokens={[
          token(
            "",
            css`
              color: red;
            `
          ),
        ]}
      ></$.Body>
    )
  ).toThrow("token() requires a non-empty string name");
  expect(() =>
    renderTemplate(
      <$.Body
        ws:tokens={[
          token("primary", [] as unknown as Parameters<typeof token>[1]),
        ]}
      ></$.Body>
    )
  ).toThrow("token() styles must include at least one valid CSS declaration");
  expect(() =>
    renderTemplate(<$.Body ws:tokens={[token("primary", css``)]}></$.Body>)
  ).toThrow("token() styles must include at least one valid CSS declaration");
});

test("validates ws:tokens values", () => {
  expect(() =>
    renderTemplate(<$.Body ws:tokens={"primary" as never}></$.Body>)
  ).toThrow("ws:tokens must be an array of token(...) values");
  expect(() =>
    renderTemplate(<$.Body ws:tokens={["primary"] as never}></$.Body>)
  ).toThrow("ws:tokens must be an array of token(...) values");
});

test("generate multiple tokens on single instance", () => {
  const { styleSources, styleSourceSelections, styles } = renderTemplate(
    <$.Body
      ws:id="body"
      ws:tokens={[
        token(
          "primary",
          css`
            color: red;
          `
        ),
        token(
          "secondary",
          css`
            font-size: 16px;
          `
        ),
      ]}
    ></$.Body>
  );
  expect(styleSources).toEqual([
    { id: "0", type: "token", name: "primary" },
    { id: "1", type: "token", name: "secondary" },
  ]);
  expect(styleSourceSelections).toEqual([
    { instanceId: "body", values: ["0", "1"] },
  ]);
  expect(styles).toHaveLength(2);
});

test("reuse same token across multiple instances", () => {
  const primary = token(
    "primary",
    css`
      color: red;
    `
  );
  const { styleSources, styleSourceSelections, styles } = renderTemplate(
    <$.Body ws:id="body" ws:tokens={[primary]}>
      <$.Box ws:id="box" ws:tokens={[primary]}></$.Box>
    </$.Body>
  );
  // Token should only be created once
  expect(styleSources).toEqual([{ id: "0", type: "token", name: "primary" }]);
  // Both instances should reference the same token
  expect(styleSourceSelections).toEqual([
    { instanceId: "body", values: ["0"] },
    { instanceId: "box", values: ["0"] },
  ]);
  // Styles should only be created once
  expect(styles).toEqual([
    {
      breakpointId: "base",
      styleSourceId: "0",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ]);
});

test("combine local styles with tokens", () => {
  const { styleSources, styleSourceSelections, styles } = renderTemplate(
    <$.Body
      ws:id="body"
      ws:style={css`
        font-size: 16px;
      `}
      ws:tokens={[
        token(
          "primary",
          css`
            color: red;
          `
        ),
      ]}
    ></$.Body>
  );
  // Both local and token style sources
  expect(styleSources).toEqual([
    { id: "body:ws:style", type: "local" },
    { id: "0", type: "token", name: "primary" },
  ]);
  // Selection should have both local style source and token
  expect(styleSourceSelections).toEqual([
    { instanceId: "body", values: ["body:ws:style", "0"] },
  ]);
  expect(styles).toHaveLength(2);
});

test("generate token with breakpoints", () => {
  const { breakpoints, styles } = renderTemplate(
    <$.Body
      ws:id="body"
      ws:tokens={[
        token(
          "responsive",
          css`
            color: red;
            @media (min-width: 1024px) {
              color: blue;
            }
          `
        ),
      ]}
    ></$.Body>
  );
  expect(breakpoints).toEqual([
    { id: "base", label: "" },
    { id: "0", label: "1024", minWidth: 1024 },
  ]);
  expect(styles).toEqual([
    {
      breakpointId: "base",
      styleSourceId: "0",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
    {
      breakpointId: "0",
      styleSourceId: "0",
      property: "color",
      value: { type: "keyword", value: "blue" },
    },
  ]);
});

test("generate token with state", () => {
  const { styles } = renderTemplate(
    <$.Body
      ws:id="body"
      ws:tokens={[
        token(
          "interactive",
          css`
            color: red;
            &:hover {
              color: blue;
            }
          `
        ),
      ]}
    ></$.Body>
  );
  expect(styles).toEqual([
    {
      breakpointId: "base",
      styleSourceId: "0",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
    {
      breakpointId: "base",
      styleSourceId: "0",
      state: ":hover",
      property: "color",
      value: { type: "keyword", value: "blue" },
    },
  ]);
});

test("generate breakpoints", () => {
  const { breakpoints, styleSources, styleSourceSelections, styles } =
    renderTemplate(
      <$.Body
        ws:style={css`
          color: red;
          @media (min-width: 1024px) {
            color: blue;
          }
        `}
      ></$.Body>
    );
  expect(breakpoints).toEqual([
    { id: "base", label: "" },
    { id: "0", label: "1024", minWidth: 1024 },
  ]);
  expect(styleSources).toEqual([{ id: "0:ws:style", type: "local" }]);
  expect(styleSourceSelections).toEqual([
    { instanceId: "0", values: ["0:ws:style"] },
  ]);
  expect(styles).toEqual([
    {
      breakpointId: "base",
      styleSourceId: "0:ws:style",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
    {
      breakpointId: "0",
      styleSourceId: "0:ws:style",
      property: "color",
      value: { type: "keyword", value: "blue" },
    },
  ]);
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
    searchParams: [{ name: "filter", value: expression`${value}` }],
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
      searchParams: [{ name: "filter", value: `$ws$dataSource$1` }],
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
    searchParams: [{ name: "filter", value: expression`${value}` }],
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
      searchParams: [{ name: "filter", value: `$ws$dataSource$1` }],
      headers: [{ name: "auth", value: `$ws$dataSource$1` }],
      body: `$ws$dataSource$1`,
    },
  ]);
});

test("render resource with control and omitted search params", () => {
  const myResource = new ResourceValue("graphqlResource", {
    control: "graphql",
    url: expression`"https://api.example.com/graphql"`,
    method: "post",
    headers: [{ name: "Content-Type", value: expression`"application/json"` }],
    body: expression`({ query: "query { viewer { id } }" })`,
  });
  const { props, resources } = renderTemplate(
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
  expect(resources).toEqual([
    {
      id: "resource:0",
      name: "graphqlResource",
      control: "graphql",
      url: `"https://api.example.com/graphql"`,
      method: "post",
      searchParams: undefined,
      headers: [{ name: "Content-Type", value: `"application/json"` }],
      body: `({ query: "query { viewer { id } }" })`,
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

test("render ws:tag property", () => {
  const { instances, props } = renderTemplate(
    <$.Body ws:id="body">
      <$.Box ws:tag="span"></$.Box>
    </$.Body>
  );
  expect(instances).toEqual([
    {
      type: "instance",
      id: "body",
      component: "Body",
      children: [{ type: "id", value: "0" }],
    },
    {
      type: "instance",
      id: "0",
      component: "Box",
      tag: "span",
      children: [],
    },
  ]);
  expect(props).toEqual([]);
});

test("preserves empty ws:tag for schema validation", () => {
  const { instances } = renderTemplate(<$.Box ws:tag=""></$.Box>);
  expect(instances[0]?.tag).toEqual("");
});

test("render ws:element with ws:tag prop", () => {
  const { instances, props } = renderTemplate(
    <$.Body ws:id="body">
      <ws.element ws:tag="span"></ws.element>
    </$.Body>
  );
  expect(instances).toEqual([
    {
      type: "instance",
      id: "body",
      component: "Body",
      children: [{ type: "id", value: "0" }],
    },
    {
      type: "instance",
      id: "0",
      component: "ws:element",
      tag: "span",
      children: [],
    },
  ]);
  expect(props).toEqual([]);
});
