import { expect, test } from "@jest/globals";
import {
  $,
  AssetValue,
  ExpressionValue,
  PageValue,
  ParameterValue,
  renderJsx,
} from "./jsx";

test("render jsx into instances with generated id", () => {
  const { instances } = renderJsx(
    <$.Body>
      <$.Box></$.Box>
      <$.Box></$.Box>
    </$.Body>
  );
  expect(instances).toEqual(
    new Map([
      [
        "0",
        {
          type: "instance",
          id: "0",
          component: "Body",
          children: [
            { type: "id", value: "1" },
            { type: "id", value: "2" },
          ],
        },
      ],
      [
        "1",
        {
          type: "instance",
          id: "1",
          component: "Box",
          children: [],
        },
      ],
      [
        "2",
        {
          type: "instance",
          id: "2",
          component: "Box",
          children: [],
        },
      ],
    ])
  );
});

test("override generated ids with ws:id prop", () => {
  const { instances } = renderJsx(
    <$.Body ws:id="custom1">
      <$.Box ws:id="custom2">
        <$.Span ws:id="custom3"></$.Span>
      </$.Box>
    </$.Body>
  );
  expect(instances).toEqual(
    new Map([
      [
        "custom1",
        {
          type: "instance",
          id: "custom1",
          component: "Body",
          children: [{ type: "id", value: "custom2" }],
        },
      ],
      [
        "custom2",
        {
          type: "instance",
          id: "custom2",
          component: "Box",
          children: [{ type: "id", value: "custom3" }],
        },
      ],
      [
        "custom3",
        {
          type: "instance",
          id: "custom3",
          component: "Span",
          children: [],
        },
      ],
    ])
  );
});

test("render text children", () => {
  const { instances } = renderJsx(<$.Body>children</$.Body>);
  expect(instances).toEqual(
    new Map([
      [
        "0",
        {
          type: "instance",
          id: "0",
          component: "Body",
          children: [{ type: "text", value: "children" }],
        },
      ],
    ])
  );
});

test("render literal props", () => {
  const { props } = renderJsx(
    <$.Body data-string="string" data-number={0}>
      <$.Box data-bool={true} data-json={{ param: "value" }}></$.Box>
    </$.Body>
  );
  expect(props).toEqual(
    new Map([
      [
        "0:data-number",
        {
          id: "0:data-number",
          instanceId: "0",
          name: "data-number",
          type: "number",
          value: 0,
        },
      ],
      [
        "0:data-string",
        {
          id: "0:data-string",
          instanceId: "0",
          name: "data-string",
          type: "string",
          value: "string",
        },
      ],
      [
        "1:data-bool",
        {
          id: "1:data-bool",
          instanceId: "1",
          name: "data-bool",
          type: "boolean",
          value: true,
        },
      ],
      [
        "1:data-json",
        {
          id: "1:data-json",
          instanceId: "1",
          name: "data-json",
          type: "json",
          value: { param: "value" },
        },
      ],
    ])
  );
});

test("render defined props", () => {
  const { props } = renderJsx(
    <$.Body
      data-expression={new ExpressionValue("1 + 1")}
      data-parameter={new ParameterValue("parameterId")}
    >
      <$.Box
        data-asset={new AssetValue("assetId")}
        data-page={new PageValue("pageId")}
        data-instance={new PageValue("pageId", "instanceId")}
      ></$.Box>
    </$.Body>
  );
  expect(props).toEqual(
    new Map([
      [
        "0:data-expression",
        {
          id: "0:data-expression",
          instanceId: "0",
          name: "data-expression",
          type: "expression",
          value: "1 + 1",
        },
      ],
      [
        "0:data-parameter",
        {
          id: "0:data-parameter",
          instanceId: "0",
          name: "data-parameter",
          type: "parameter",
          value: "parameterId",
        },
      ],
      [
        "1:data-asset",
        {
          id: "1:data-asset",
          instanceId: "1",
          name: "data-asset",
          type: "asset",
          value: "assetId",
        },
      ],
      [
        "1:data-page",
        {
          id: "1:data-page",
          instanceId: "1",
          name: "data-page",
          type: "page",
          value: "pageId",
        },
      ],
      [
        "1:data-instance",
        {
          id: "1:data-instance",
          instanceId: "1",
          name: "data-instance",
          type: "page",
          value: { pageId: "pageId", instanceId: "instanceId" },
        },
      ],
    ])
  );
});
