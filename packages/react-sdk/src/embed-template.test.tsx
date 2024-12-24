import { expect, test } from "vitest";
import { generateDataFromEmbedTemplate, namespaceMeta } from "./embed-template";
import { showAttribute } from "./props";

const expectString = expect.any(String);

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
      new Map()
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
    assets: [],
    breakpoints: [],
    resources: [],
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
      new Map()
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
    assets: [],
    breakpoints: [],
    resources: [],
  });
});

test("generate data for embedding from styles", () => {
  const fragment = generateDataFromEmbedTemplate(
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
    new Map()
  );
  const baseBreakpointId = fragment.breakpoints[0].id;
  expect(fragment).toEqual({
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
        breakpointId: baseBreakpointId,
        styleSourceId: expectString,
        state: undefined,
        property: "width",
        value: { type: "keyword", value: "auto" },
      },
      {
        breakpointId: baseBreakpointId,
        styleSourceId: expectString,
        state: undefined,
        property: "height",
        value: { type: "keyword", value: "auto" },
      },
      {
        breakpointId: baseBreakpointId,
        styleSourceId: expectString,
        state: undefined,
        property: "color",
        value: { type: "keyword", value: "black" },
      },
    ],
    assets: [],
    breakpoints: [
      {
        id: baseBreakpointId,
        label: "",
      },
    ],
    resources: [],
  });
});

test("generate data for embedding from props bound to data source variables", () => {
  expect(
    generateDataFromEmbedTemplate(
      [
        {
          type: "instance",
          component: "Box1",
          variables: {
            showOtherBoxDataSource: { initialValue: false },
          },
          props: [
            {
              type: "expression",
              name: "showOtherBox",
              code: "showOtherBoxDataSource",
            },
          ],
          children: [],
        },
        {
          type: "instance",
          component: "Box2",
          props: [
            {
              type: "expression",
              name: showAttribute,
              code: "showOtherBoxDataSource",
            },
          ],
          children: [],
        },
      ],
      new Map()
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
        type: "expression",
        name: "showOtherBox",
        value: expect.stringMatching(/\$ws\$dataSource\$\w+/),
      },
      {
        id: expectString,
        instanceId: expectString,
        type: "expression",
        name: showAttribute,
        value: expect.stringMatching(/\$ws\$dataSource\$\w+/),
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
    assets: [],
    breakpoints: [],
    resources: [],
  });
});

test("generate variables with aliases instead of reference name", () => {
  expect(
    generateDataFromEmbedTemplate(
      [
        {
          type: "instance",
          component: "Box",
          variables: {
            myVar: { alias: "My Variable", initialValue: false },
          },
          children: [],
        },
      ],
      new Map()
    )
  ).toEqual({
    children: [{ type: "id", value: expectString }],
    instances: [
      { type: "instance", id: expectString, component: "Box", children: [] },
    ],
    props: [],
    dataSources: [
      {
        type: "variable",
        id: expectString,
        scopeInstanceId: expectString,
        name: "My Variable",
        value: {
          type: "boolean",
          value: false,
        },
      },
    ],
    styleSourceSelections: [],
    styleSources: [],
    styles: [],
    assets: [],
    breakpoints: [],
    resources: [],
  });
});

test("generate data for embedding from props with complex expressions", () => {
  expect(
    generateDataFromEmbedTemplate(
      [
        {
          type: "instance",
          component: "Box1",
          variables: {
            boxState: { initialValue: "initial" },
          },
          props: [
            {
              type: "expression",
              name: "state",
              code: "boxState",
            },
          ],
          children: [],
        },
        {
          type: "instance",
          component: "Box2",
          props: [
            {
              type: "expression",
              name: showAttribute,
              code: "boxState === 'success'",
            },
          ],
          children: [],
        },
      ],
      new Map()
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
        type: "expression",
        name: "state",
        value: expect.stringMatching(/\$ws\$dataSource\$\w+/),
      },
      {
        id: expectString,
        instanceId: expectString,
        type: "expression",
        name: showAttribute,
        value: expect.stringMatching(/\$ws\$dataSource\$\w+ === 'success'/),
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
    assets: [],
    breakpoints: [],
    resources: [],
  });
});

test("generate data for embedding from action props", () => {
  expect(
    generateDataFromEmbedTemplate(
      [
        {
          type: "instance",
          component: "Box1",
          variables: {
            boxState: { initialValue: "initial" },
          },
          props: [
            {
              type: "expression",
              name: "state",
              code: "boxState",
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
      new Map()
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
        type: "expression",
        name: "state",
        value: expect.stringMatching(/\$ws\$dataSource\$\w+/),
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
    assets: [],
    breakpoints: [],
    resources: [],
  });
});

test("generate data for embedding from parameter props", () => {
  const data = generateDataFromEmbedTemplate(
    [
      {
        type: "instance",
        component: "Box",
        props: [
          {
            type: "parameter",
            name: "myParameter",
            variableName: "parameterName",
          },
          {
            type: "parameter",
            name: "anotherParameter",
            variableName: "anotherParameterName",
            variableAlias: "Another Parameter",
          },
        ],
        children: [],
      },
    ],
    new Map()
  );
  const instanceId = data.instances[0].id;
  const variableId = data.dataSources[0].id;
  const anotherVariableId = data.dataSources[1].id;
  expect(data).toEqual({
    children: [{ type: "id", value: instanceId }],
    instances: [
      {
        type: "instance",
        id: instanceId,
        component: "Box",
        children: [],
      },
    ],
    props: [
      {
        id: expectString,
        instanceId,
        name: "myParameter",
        type: "parameter",
        value: variableId,
      },
      {
        id: expectString,
        instanceId,
        name: "anotherParameter",
        type: "parameter",
        value: anotherVariableId,
      },
    ],
    dataSources: [
      {
        type: "parameter",
        id: variableId,
        scopeInstanceId: instanceId,
        name: "parameterName",
      },
      {
        type: "parameter",
        id: anotherVariableId,
        scopeInstanceId: instanceId,
        name: "Another Parameter",
      },
    ],
    styleSourceSelections: [],
    styleSources: [],
    styles: [],
    assets: [],
    breakpoints: [],
    resources: [],
  });
});

test("generate data for embedding from instance child bound to variables", () => {
  expect(
    generateDataFromEmbedTemplate(
      [
        {
          type: "instance",
          component: "Box",
          variables: {
            myValue: { initialValue: "text" },
          },
          children: [{ type: "expression", value: "myValue" }],
        },
      ],
      new Map()
    )
  ).toEqual({
    children: [{ type: "id", value: expectString }],
    instances: [
      {
        type: "instance",
        id: expectString,
        component: "Box",
        children: [
          {
            type: "expression",
            value: expect.stringMatching(/\$ws\$dataSource\$\w+/),
          },
        ],
      },
    ],
    dataSources: [
      {
        type: "variable",
        id: expectString,
        scopeInstanceId: expectString,
        name: "myValue",
        value: { type: "string", value: "text" },
      },
    ],
    props: [],
    styleSourceSelections: [],
    styleSources: [],
    styles: [],
    assets: [],
    breakpoints: [],
    resources: [],
  });
});

test("add namespace to selected components in embed template", () => {
  expect(
    namespaceMeta(
      {
        type: "container",
        label: "",
        icon: "",
        constraints: {
          relation: "ancestor",
          component: { $nin: ["Button", "Box"] },
        },
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
    constraints: {
      relation: "ancestor",
      component: { $nin: ["my-namespace:Button", "my-namespace:Box"] },
    },
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
