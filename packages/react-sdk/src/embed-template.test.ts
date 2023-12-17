import { expect, test } from "@jest/globals";
import { generateDataFromEmbedTemplate, namespaceMeta } from "./embed-template";
import { showAttribute } from "./props";
import type { WsComponentMeta } from "./components/component-meta";

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
      new Map(),
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
      new Map(),
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
      new Map(),
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
      new Map(),
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
      new Map(),
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
      new Map(),
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
        ],
        children: [],
      },
    ],
    new Map(),
    defaultBreakpointId
  );
  const instanceId = data.instances[0].id;
  const variableId = data.dataSources[0].id;
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
    ],
    dataSources: [
      {
        type: "parameter",
        id: variableId,
        scopeInstanceId: instanceId,
        name: "parameterName",
      },
    ],
    styleSourceSelections: [],
    styleSources: [],
    styles: [],
  });
});

test("generate styles from tokens", () => {
  const presetTokens: WsComponentMeta["presetTokens"] = {
    box: {
      styles: [
        {
          property: "width",
          value: { type: "keyword", value: "max-content" },
        },
        {
          property: "height",
          value: { type: "keyword", value: "max-content" },
        },
      ],
    },
    boxBright: {
      styles: [
        {
          property: "color",
          value: { type: "keyword", value: "red" },
        },
        {
          property: "backgroundColor",
          value: { type: "keyword", value: "pink" },
        },
      ],
    },
    boxNone: {
      styles: [
        {
          property: "color",
          value: { type: "keyword", value: "transparent" },
        },
        {
          property: "backgroundColor",
          value: { type: "keyword", value: "transparent" },
        },
      ],
    },
  };
  const { styleSourceSelections, styleSources, styles } =
    generateDataFromEmbedTemplate(
      [
        {
          type: "instance",
          component: "Box",
          tokens: ["box", "boxBright"],
          children: [],
        },
      ],
      new Map([["Box", { type: "container", icon: "", presetTokens }]]),
      defaultBreakpointId
    );
  expect(styleSources).toEqual([
    { id: "Box:box", name: "Box", type: "token" },
    { id: "Box:boxBright", name: "Box Bright", type: "token" },
  ]);
  expect(styleSourceSelections).toEqual([
    { instanceId: expectString, values: ["Box:box", "Box:boxBright"] },
  ]);
  expect(styles).toEqual([
    {
      breakpointId: "base",
      property: "width",
      styleSourceId: "Box:box",
      value: { type: "keyword", value: "max-content" },
    },
    {
      breakpointId: "base",
      property: "height",
      styleSourceId: "Box:box",
      value: { type: "keyword", value: "max-content" },
    },
    {
      breakpointId: "base",
      property: "color",
      styleSourceId: "Box:boxBright",
      value: { type: "keyword", value: "red" },
    },
    {
      breakpointId: "base",
      property: "backgroundColor",
      styleSourceId: "Box:boxBright",
      value: { type: "keyword", value: "pink" },
    },
  ]);
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
        presetTokens: {
          base: { styles: [] },
          small: { styles: [] },
          large: { styles: [] },
        },
        template: [
          {
            type: "instance",
            component: "Tooltip",
            tokens: ["base", "small"],
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
    presetTokens: {
      base: { styles: [] },
      small: { styles: [] },
      large: { styles: [] },
    },
    template: [
      {
        type: "instance",
        component: "my-namespace:Tooltip",
        tokens: ["base", "small"],
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
