import { expect, test } from "@jest/globals";
import { generateDataFromEmbedTemplate } from "./embed-template";
import { showAttribute } from "./tree";

const expectString = expect.any(String) as unknown as string;

const defaultBreakpointId = "base";

test("generate data for embedding from instances and text", () => {
  expect(
    generateDataFromEmbedTemplate(
      [
        { type: "text", value: "hello" },
        {
          type: "instance",
          component: "Box1",
          children: [
            { type: "instance", component: "Box2", children: [] },
            { type: "text", value: "world" },
          ],
        },
      ],
      defaultBreakpointId
    )
  ).toEqual({
    children: [
      { type: "text", value: "hello" },
      { type: "id", value: expectString },
    ],
    instances: [
      {
        type: "instance",
        id: expectString,
        component: "Box1",
        children: [
          { type: "id", value: expectString },
          { type: "text", value: "world" },
        ],
      },
      {
        type: "instance",
        id: expectString,
        component: "Box2",
        children: [],
      },
    ],
    props: [],
    dataSources: [],
    styleSourceSelections: [],
    styleSources: [],
    styles: [],
  });
});

test("generate data for embedding from props", () => {
  expect(
    generateDataFromEmbedTemplate(
      [
        {
          type: "instance",
          component: "Box1",
          props: [
            { type: "string", name: "data-prop1", value: "value1" },
            { type: "string", name: "data-prop2", value: "value2" },
          ],
          children: [
            {
              type: "instance",
              component: "Box2",
              props: [{ type: "string", name: "data-prop3", value: "value3" }],
              children: [],
            },
          ],
        },
      ],
      defaultBreakpointId
    )
  ).toEqual({
    children: [{ type: "id", value: expectString }],
    instances: [
      {
        type: "instance",
        id: expectString,
        component: "Box1",
        children: [{ type: "id", value: expectString }],
      },
      {
        type: "instance",
        id: expectString,
        component: "Box2",
        children: [],
      },
    ],
    props: [
      {
        type: "string",
        id: expectString,
        instanceId: expectString,
        name: "data-prop1",
        value: "value1",
      },
      {
        type: "string",
        id: expectString,
        instanceId: expectString,
        name: "data-prop2",
        value: "value2",
      },
      {
        type: "string",
        id: expectString,
        instanceId: expectString,
        name: "data-prop3",
        value: "value3",
      },
    ],
    dataSources: [],
    styleSourceSelections: [],
    styleSources: [],
    styles: [],
  });
});

test("generate data for embedding from styles", () => {
  expect(
    generateDataFromEmbedTemplate(
      [
        {
          type: "instance",
          component: "Box1",
          styles: [
            { property: "width", value: { type: "keyword", value: "auto" } },
            { property: "height", value: { type: "keyword", value: "auto" } },
          ],
          children: [
            {
              type: "instance",
              component: "Box2",
              styles: [
                {
                  property: "color",
                  value: { type: "keyword", value: "black" },
                },
              ],
              children: [],
            },
          ],
        },
      ],
      defaultBreakpointId
    )
  ).toEqual({
    children: [{ type: "id", value: expectString }],
    instances: [
      {
        type: "instance",
        id: expectString,
        component: "Box1",
        children: [{ type: "id", value: expectString }],
      },
      {
        type: "instance",
        id: expectString,
        component: "Box2",
        children: [],
      },
    ],
    props: [],
    dataSources: [],
    styleSourceSelections: [
      {
        instanceId: expectString,
        values: [expectString],
      },
      {
        instanceId: expectString,
        values: [expectString],
      },
    ],
    styleSources: [
      {
        type: "local",
        id: expectString,
      },
      {
        type: "local",
        id: expectString,
      },
    ],
    styles: [
      {
        breakpointId: "base",
        styleSourceId: expectString,
        state: undefined,
        property: "width",
        value: { type: "keyword", value: "auto" },
      },
      {
        breakpointId: "base",
        styleSourceId: expectString,
        state: undefined,
        property: "height",
        value: { type: "keyword", value: "auto" },
      },
      {
        breakpointId: "base",
        styleSourceId: expectString,
        state: undefined,
        property: "color",
        value: { type: "keyword", value: "black" },
      },
    ],
  });
});

test("generate data for embedding from props bound to data sources", () => {
  expect(
    generateDataFromEmbedTemplate(
      [
        {
          type: "instance",
          component: "Box1",
          props: [
            {
              type: "boolean",
              name: "showOtherBox",
              dataSourceRef: "showOtherBoxDataSource",
              value: false,
            },
          ],
          children: [],
        },
        {
          type: "instance",
          component: "Box2",
          props: [
            {
              type: "boolean",
              name: showAttribute,
              dataSourceRef: "showOtherBoxDataSource",
              value: false,
            },
          ],
          children: [],
        },
      ],
      defaultBreakpointId
    )
  ).toEqual({
    children: [
      { type: "id", value: expectString },
      { type: "id", value: expectString },
    ],
    instances: [
      { type: "instance", id: expectString, component: "Box1", children: [] },
      { type: "instance", id: expectString, component: "Box2", children: [] },
    ],
    props: [
      {
        id: expectString,
        instanceId: expectString,
        type: "dataSource",
        name: "showOtherBox",
        value: expectString,
      },
      {
        id: expectString,
        instanceId: expectString,
        type: "dataSource",
        name: showAttribute,
        value: expectString,
      },
    ],
    dataSources: [
      {
        id: expectString,
        name: "showOtherBoxDataSource",
        type: "boolean",
        value: false,
      },
    ],
    styleSourceSelections: [],
    styleSources: [],
    styles: [],
  });
});
