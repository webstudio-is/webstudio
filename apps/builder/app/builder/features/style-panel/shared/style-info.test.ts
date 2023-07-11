import { test, expect, describe } from "@jest/globals";
import { renderHook } from "@testing-library/react-hooks";
import * as defaultMetas from "@webstudio-is/sdk-components-react/metas";
import {
  getStyleDeclKey,
  type Breakpoints,
  type Instance,
  type Instances,
  type StyleDecl,
  type StylesList,
} from "@webstudio-is/project-build";
import {
  breakpointsStore,
  instancesStore,
  registeredComponentMetasStore,
  selectedInstanceIntanceToTagStore,
  selectedInstanceSelectorStore,
  selectedStyleSourceSelectorStore,
  styleSourceSelectionsStore,
  styleSourcesStore,
  stylesStore,
} from "~/shared/nano-states";
import {
  getCascadedBreakpointIds,
  getCascadedInfo,
  getInheritedInfo,
  getNextSourceInfo,
  getPreviousSourceInfo,
  useStyleInfo,
} from "./style-info";

const metas = new Map(Object.entries(defaultMetas));

const breakpoints: Breakpoints = new Map([
  ["1", { id: "1", label: "1", minWidth: 0 }],
  ["2", { id: "2", label: "2", minWidth: 768 }],
  ["3", { id: "3", label: "3", minWidth: 1280 }],
  ["4", { id: "4", label: "4", minWidth: 1920 }],
]);

const selectedBreakpointId = "3";
const selectedInstanceSelector = ["3", "2", "1"];
const cascadedBreakpointIds = getCascadedBreakpointIds(
  breakpoints,
  selectedBreakpointId
);

const cascadingStylesByInstanceId = new Map<Instance["id"], StyleDecl[]>();
cascadingStylesByInstanceId.set(selectedInstanceSelector[0], [
  {
    breakpointId: "1",
    styleSourceId: "styleSourceId",
    property: "width",
    value: { type: "unit", value: 100, unit: "px" },
  },
  {
    breakpointId: "1",
    styleSourceId: "styleSourceId",
    property: "height",
    value: { type: "unit", value: 50, unit: "px" },
  },
  {
    breakpointId: "2",
    styleSourceId: "styleSourceId",
    property: "width",
    value: { type: "unit", value: 200, unit: "px" },
  },
  {
    breakpointId: "3",
    styleSourceId: "styleSourceId",
    // should not be computed because current breakpoint
    property: "height",
    value: { type: "unit", value: 150, unit: "px" },
  },
  {
    breakpointId: "4",
    styleSourceId: "styleSourceId",
    property: "width",
    value: { type: "unit", value: 400, unit: "px" },
  },
]);

const instances: Instances = new Map([
  [
    "1",
    {
      type: "instance",
      id: "1",
      component: "Body",
      children: [{ type: "id", value: "2" }],
    },
  ],
  [
    "2",
    {
      type: "instance",
      id: "2",
      component: "Box",
      children: [{ type: "id", value: "3" }],
    },
  ],
  [
    "3",
    {
      type: "instance",
      id: "3",
      component: "Box",
      children: [],
    },
  ],
]);

const inheritingStylesByInstanceId = new Map<Instance["id"], StyleDecl[]>();
inheritingStylesByInstanceId.set("1", [
  // should be inherited even from another breakpoint
  {
    breakpointId: "1",
    styleSourceId: "styleSourceId1",
    property: "fontSize",
    value: { type: "unit", value: 20, unit: "px" },
  },
]);
inheritingStylesByInstanceId.set("2", [
  // should not be inherited because width is not inheritable
  {
    breakpointId: "3",
    styleSourceId: "styleSourceId2",
    property: "width",
    value: { type: "unit", value: 100, unit: "px" },
  },
  // should be inherited from selected breakpoint
  {
    breakpointId: "3",
    styleSourceId: "styleSourceId2",
    property: "fontWeight",
    value: { type: "keyword", value: "600" },
  },
]);
inheritingStylesByInstanceId.set("3", [
  // should not show selected style as inherited
  {
    breakpointId: "3",
    styleSourceId: "styleSourceId3",
    property: "fontWeight",
    value: { type: "keyword", value: "500" },
  },
]);

test("compute cascaded styles", () => {
  expect(
    getCascadedInfo(
      cascadingStylesByInstanceId,
      selectedInstanceSelector[0],
      cascadedBreakpointIds
    )
  ).toMatchInlineSnapshot(`
    {
      "height": {
        "breakpointId": "1",
        "value": {
          "type": "unit",
          "unit": "px",
          "value": 50,
        },
      },
      "width": {
        "breakpointId": "2",
        "value": {
          "type": "unit",
          "unit": "px",
          "value": 200,
        },
      },
    }
  `);
});

test("compute inherited styles", () => {
  expect(
    getInheritedInfo(
      instances,
      metas,
      inheritingStylesByInstanceId,
      selectedInstanceSelector,
      new Map([
        ["1", "body"],
        ["2", "div"],
        ["3", "div"],
      ]),

      cascadedBreakpointIds,
      selectedBreakpointId
    )
  ).toMatchInlineSnapshot(`
    {
      "fontFamily": {
        "instanceId": "1",
        "value": {
          "type": "keyword",
          "value": "Arial, Roboto, sans-serif",
        },
      },
      "fontSize": {
        "instanceId": "1",
        "styleSourceId": "styleSourceId1",
        "value": {
          "type": "unit",
          "unit": "px",
          "value": 20,
        },
      },
      "fontWeight": {
        "instanceId": "2",
        "styleSourceId": "styleSourceId2",
        "value": {
          "type": "keyword",
          "value": "600",
        },
      },
      "lineHeight": {
        "instanceId": "1",
        "value": {
          "type": "unit",
          "unit": "number",
          "value": 1.2,
        },
      },
    }
  `);
});

test("compute styles from previous sources", () => {
  const styleSourceSelections = new Map([
    ["3", { instanceId: "3", values: ["1", "2", "3", "4"] }],
  ]);
  const selectedStyleSourceSelector = {
    styleSourceId: "3",
  };
  const stylesByInstanceId = new Map<Instance["id"], StylesList>([
    [
      "3",
      [
        {
          breakpointId: "bp",
          styleSourceId: "1",
          property: "width",
          value: { type: "unit", value: 100, unit: "px" },
        },
        {
          breakpointId: "bp",
          styleSourceId: "2",
          property: "width",
          value: { type: "unit", value: 200, unit: "px" },
        },
        // prevent overriding by value from other breakpoint
        {
          breakpointId: "bp2",
          styleSourceId: "2",
          property: "width",
          value: { type: "unit", value: 250, unit: "px" },
        },
        {
          breakpointId: "bp",
          styleSourceId: "3",
          property: "width",
          value: { type: "unit", value: 300, unit: "px" },
        },
        {
          breakpointId: "bp",
          styleSourceId: "4",
          property: "width",
          value: { type: "unit", value: 400, unit: "px" },
        },
      ],
    ],
  ]);
  expect(
    getPreviousSourceInfo(
      styleSourceSelections,
      stylesByInstanceId,
      selectedInstanceSelector,
      selectedStyleSourceSelector,
      "bp"
    )
  ).toMatchInlineSnapshot(`
    {
      "width": {
        "styleSourceId": "2",
        "value": {
          "type": "unit",
          "unit": "px",
          "value": 200,
        },
      },
    }
  `);
});

test("compute styles from next sources", () => {
  const styleSourceSelections = new Map([
    ["3", { instanceId: "3", values: ["1", "2", "3", "4"] }],
  ]);
  const selectedStyleSourceSelector = {
    styleSourceId: "3",
  };
  const stylesByInstanceId = new Map<Instance["id"], StylesList>([
    [
      "3",
      [
        {
          breakpointId: "bp",
          styleSourceId: "1",
          property: "width",
          value: { type: "unit", value: 100, unit: "px" },
        },
        {
          breakpointId: "bp",
          styleSourceId: "2",
          property: "width",
          value: { type: "unit", value: 200, unit: "px" },
        },
        {
          breakpointId: "bp",
          styleSourceId: "3",
          property: "width",
          value: { type: "unit", value: 300, unit: "px" },
        },
        {
          breakpointId: "bp",
          styleSourceId: "4",
          property: "width",
          value: { type: "unit", value: 400, unit: "px" },
        },
        // prevent overriding by value from other breakpoint
        {
          breakpointId: "bp2",
          styleSourceId: "4",
          property: "width",
          value: { type: "unit", value: 450, unit: "px" },
        },
      ],
    ],
  ]);
  expect(
    getNextSourceInfo(
      styleSourceSelections,
      stylesByInstanceId,
      selectedInstanceSelector,
      selectedStyleSourceSelector,
      "bp"
    )
  ).toMatchInlineSnapshot(`
    {
      "width": {
        "styleSourceId": "4",
        "value": {
          "type": "unit",
          "unit": "px",
          "value": 400,
        },
      },
    }
  `);
});

const resetStores = () => {
  registeredComponentMetasStore.set(new Map());
  instancesStore.set(new Map());
  stylesStore.set(new Map());
  styleSourcesStore.set(new Map());
  styleSourceSelectionsStore.set(new Map());
  breakpointsStore.set(new Map());
  selectedInstanceSelectorStore.set(undefined);
  selectedInstanceIntanceToTagStore.set(new Map());
  selectedStyleSourceSelectorStore.set(undefined);
};

describe("color and currentColor", () => {
  const bodyBoxInstances: Instances = new Map([
    [
      "body",
      {
        type: "instance",
        id: "body",
        component: "Body",
        children: [{ type: "id", value: "box" }],
      },
    ],
    ["box", { type: "instance", id: "box", component: "Box", children: [] }],
  ]);
  const baseBreakpoint = new Map([["base", { id: "base", label: "Base" }]]);

  test("initial color and currentColor is taken from properties", () => {
    resetStores();
    instancesStore.set(bodyBoxInstances);
    selectedInstanceSelectorStore.set(["box", "body"]);
    const { result } = renderHook(() => useStyleInfo());
    expect(result.current.color?.value).toEqual({
      type: "keyword",
      value: "black",
    });
    expect(result.current.color?.currentColor).toEqual({
      type: "keyword",
      value: "black",
    });
  });

  test("color and currentColor inherits from parent instance", () => {
    resetStores();
    instancesStore.set(bodyBoxInstances);
    breakpointsStore.set(baseBreakpoint);
    styleSourcesStore.set(
      new Map([["body.local", { id: "body.local", type: "local" }]])
    );
    styleSourceSelectionsStore.set(
      new Map([["body", { instanceId: "body", values: ["body.local"] }]])
    );
    const bodyColor: StyleDecl = {
      styleSourceId: "body.local",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    };
    stylesStore.set(new Map([[getStyleDeclKey(bodyColor), bodyColor]]));
    selectedInstanceSelectorStore.set(["box", "body"]);
    const { result } = renderHook(() => useStyleInfo());
    expect(result.current.color?.value).toEqual({
      type: "keyword",
      value: "red",
    });
    expect(result.current.color?.currentColor).toEqual({
      type: "keyword",
      value: "red",
    });
  });

  test("color: inherit inherits from parent instance", () => {
    resetStores();
    instancesStore.set(bodyBoxInstances);
    breakpointsStore.set(baseBreakpoint);
    styleSourcesStore.set(
      new Map([
        ["body.local", { id: "body.local", type: "local" }],
        ["box.local", { id: "box.local", type: "local" }],
      ])
    );
    styleSourceSelectionsStore.set(
      new Map([
        ["body", { instanceId: "body", values: ["body.local"] }],
        ["box", { instanceId: "box", values: ["box.local"] }],
      ])
    );
    const bodyColor: StyleDecl = {
      styleSourceId: "body.local",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    };
    const boxColor: StyleDecl = {
      styleSourceId: "box.local",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "inherit" },
    };
    stylesStore.set(
      new Map([
        [getStyleDeclKey(bodyColor), bodyColor],
        [getStyleDeclKey(boxColor), boxColor],
      ])
    );
    selectedInstanceSelectorStore.set(["box", "body"]);
    const { result } = renderHook(() => useStyleInfo());
    expect(result.current.color?.value).toEqual({
      type: "keyword",
      value: "inherit",
    });
    expect(result.current.color?.currentColor).toEqual({
      type: "keyword",
      value: "red",
    });
  });

  test("color: currentColor inherits from parent instance", () => {
    resetStores();
    instancesStore.set(bodyBoxInstances);
    breakpointsStore.set(baseBreakpoint);
    styleSourcesStore.set(
      new Map([
        ["body.local", { id: "body.local", type: "local" }],
        ["box.local", { id: "box.local", type: "local" }],
      ])
    );
    styleSourceSelectionsStore.set(
      new Map([
        ["body", { instanceId: "body", values: ["body.local"] }],
        ["box", { instanceId: "box", values: ["box.local"] }],
      ])
    );
    const bodyColor: StyleDecl = {
      styleSourceId: "body.local",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    };
    const boxColor: StyleDecl = {
      styleSourceId: "box.local",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "currentColor" },
    };
    stylesStore.set(
      new Map([
        [getStyleDeclKey(bodyColor), bodyColor],
        [getStyleDeclKey(boxColor), boxColor],
      ])
    );
    selectedInstanceSelectorStore.set(["box", "body"]);
    const { result } = renderHook(() => useStyleInfo());
    expect(result.current.color?.value).toEqual({
      type: "keyword",
      value: "currentColor",
    });
    expect(result.current.color?.currentColor).toEqual({
      type: "keyword",
      value: "red",
    });
  });

  test("color and currentColor inherits default value", () => {
    resetStores();
    instancesStore.set(bodyBoxInstances);
    breakpointsStore.set(baseBreakpoint);
    styleSourcesStore.set(
      new Map([["body.local", { id: "body.local", type: "local" }]])
    );
    styleSourceSelectionsStore.set(
      new Map([["body", { instanceId: "body", values: ["body.local"] }]])
    );
    const bodyColor: StyleDecl = {
      styleSourceId: "body.local",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "inherit" },
    };
    stylesStore.set(new Map([[getStyleDeclKey(bodyColor), bodyColor]]));
    selectedInstanceSelectorStore.set(["box", "body"]);
    const { result } = renderHook(() => useStyleInfo());
    expect(result.current.color?.value).toEqual({
      type: "keyword",
      value: "inherit",
    });
    expect(result.current.color?.currentColor).toEqual({
      type: "keyword",
      value: "black",
    });
  });
});
