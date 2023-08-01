import { expect, test } from "@jest/globals";
import { generateDataFromEmbedTemplate, namespaceMeta } from "./embed-template";
import { showAttribute } from "./tree";

const expectString = expect.any(String);

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

test("generate data for embedding from props bound to data source variables", () => {
  expect(
    generateDataFromEmbedTemplate(
      [
        {
          type: "instance",
          component: "Box1",
          dataSources: {
            showOtherBoxDataSource: { type: "variable", initialValue: false },
          },
          props: [
            {
              type: "dataSource",
              name: "showOtherBox",
              dataSourceName: "showOtherBoxDataSource",
            },
          ],
          children: [],
        },
        {
          type: "instance",
          component: "Box2",
          props: [
            {
              type: "dataSource",
              name: showAttribute,
              dataSourceName: "showOtherBoxDataSource",
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
        type: "variable",
        id: expectString,
        scopeInstanceId: expectString,
        name: "showOtherBoxDataSource",
        value: {
          type: "boolean",
          value: false,
        },
      },
    ],
    styleSourceSelections: [],
    styleSources: [],
    styles: [],
  });
});

test("generate data for embedding from props bound to data source expressions", () => {
  expect(
    generateDataFromEmbedTemplate(
      [
        {
          type: "instance",
          component: "Box1",
          dataSources: {
            boxState: { type: "variable", initialValue: "initial" },
            boxStateSuccess: {
              type: "expression",
              code: `boxState === 'success'`,
            },
          },
          props: [
            {
              type: "dataSource",
              name: "state",
              dataSourceName: "boxState",
            },
          ],
          children: [],
        },
        {
          type: "instance",
          component: "Box2",
          props: [
            {
              type: "dataSource",
              name: showAttribute,
              dataSourceName: "boxStateSuccess",
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
        name: "state",
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
        type: "variable",
        id: expectString,
        scopeInstanceId: expectString,
        name: "boxState",
        value: {
          type: "string",
          value: "initial",
        },
      },
      {
        type: "expression",
        id: expectString,
        scopeInstanceId: expectString,
        name: "boxStateSuccess",
        code: expect.stringMatching(/\$ws\$dataSource\$\w+ === 'success'/),
      },
    ],
    styleSourceSelections: [],
    styleSources: [],
    styles: [],
  });
});

test("generate data for embedding from action props", () => {
  expect(
    generateDataFromEmbedTemplate(
      [
        {
          type: "instance",
          component: "Box1",
          dataSources: {
            boxState: { type: "variable", initialValue: "initial" },
          },
          props: [
            {
              type: "dataSource",
              name: "state",
              dataSourceName: "boxState",
            },
          ],
          children: [
            {
              type: "instance",
              component: "Box2",
              props: [
                {
                  type: "action",
                  name: "onClick",
                  value: [{ type: "execute", code: `boxState = 'success'` }],
                },
                {
                  type: "action",
                  name: "onChange",
                  value: [
                    {
                      type: "execute",
                      args: ["value"],
                      code: `boxState = value`,
                    },
                  ],
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
      { type: "instance", id: expectString, component: "Box2", children: [] },
    ],
    props: [
      {
        id: expectString,
        instanceId: expectString,
        type: "dataSource",
        name: "state",
        value: expectString,
      },
      {
        id: expectString,
        instanceId: expectString,
        type: "action",
        name: "onClick",
        value: [
          {
            type: "execute",
            args: [],
            code: expect.stringMatching(/\$ws\$dataSource\$\w+ = 'success'/),
          },
        ],
      },
      {
        id: expectString,
        instanceId: expectString,
        type: "action",
        name: "onChange",
        value: [
          {
            type: "execute",
            args: ["value"],
            code: expect.stringMatching(/\$ws\$dataSource\$\w+ = value/),
          },
        ],
      },
    ],
    dataSources: [
      {
        type: "variable",
        id: expectString,
        scopeInstanceId: expectString,
        name: "boxState",
        value: {
          type: "string",
          value: "initial",
        },
      },
    ],
    styleSourceSelections: [],
    styleSources: [],
    styles: [],
  });
});

test("add namespace to selected components in embed template", () => {
  expect(
    namespaceMeta(
      {
        type: "container",
        label: "",
        icon: "",
        requiredAncestors: ["Button", "Box"],
        invalidAncestors: ["Tooltip"],
        indexWithinAncestor: "Tooltip",
        template: [
          {
            type: "instance",
            component: "Tooltip",
            children: [
              { type: "text", value: "Some text" },
              {
                type: "instance",
                component: "Box",
                children: [
                  {
                    type: "instance",
                    component: "Button",
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      "my-namespace",
      new Set(["Tooltip", "Button"])
    )
  ).toEqual({
    type: "container",
    label: "",
    icon: "",
    requiredAncestors: ["my-namespace:Button", "Box"],
    invalidAncestors: ["my-namespace:Tooltip"],
    indexWithinAncestor: "my-namespace:Tooltip",
    template: [
      {
        type: "instance",
        component: "my-namespace:Tooltip",
        children: [
          { type: "text", value: "Some text" },
          {
            type: "instance",
            component: "Box",
            children: [
              {
                type: "instance",
                component: "my-namespace:Button",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  });
});
