import { test, expect, describe } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-hooks";
import * as defaultMetas from "@webstudio-is/sdk-components-react/metas";
import {
  getStyleDeclKey,
  type Breakpoints,
  type Instance,
  type Instances,
  type StyleDecl,
  StyleSourceSelection,
} from "@webstudio-is/sdk";
import {
  $selectedBreakpointId,
  $selectedInstanceStates,
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
  getStyleSource,
  useStyleInfo,
} from "./style-info";

const toMap = <T extends { id: string }>(list: T[]) =>
  new Map(list.map((item) => [item.id, item]));

const toStyleSourceSelectionsMap = (list: StyleSourceSelection[]) =>
  new Map(list.map((item) => [item.instanceId, item]));

const toStylesMap = (list: StyleDecl[]) =>
  new Map(list.map((item) => [getStyleDeclKey(item), item]));

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
      cascadedBreakpointIds,
      new Set()
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
      selectedBreakpointId,
      new Set()
    )
  ).toMatchInlineSnapshot(`
    {
      "MozOsxFontSmoothing": {
        "instanceId": "1",
        "value": {
          "type": "keyword",
          "value": "grayscale",
        },
      },
      "WebkitFontSmoothing": {
        "instanceId": "1",
        "value": {
          "type": "keyword",
          "value": "antialiased",
        },
      },
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
  const stylesByInstanceId = new Map<Instance["id"], StyleDecl[]>([
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
      "bp",
      new Set()
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
  const stylesByInstanceId = new Map<Instance["id"], StyleDecl[]>([
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
      "bp",
      new Set()
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
  $selectedInstanceStates.set(new Set());
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

describe("active states", () => {
  test("show stateless style as remote when state is selected", () => {
    resetStores();
    instancesStore.set(
      toMap([{ type: "instance", id: "box", component: "Box", children: [] }])
    );
    breakpointsStore.set(toMap([{ id: "base", label: "" }]));
    styleSourcesStore.set(toMap([{ id: "box.local", type: "local" }]));
    styleSourceSelectionsStore.set(
      toStyleSourceSelectionsMap([{ instanceId: "box", values: ["box.local"] }])
    );
    stylesStore.set(
      toStylesMap([
        {
          styleSourceId: "box.local",
          breakpointId: "base",
          property: "color",
          value: { type: "keyword", value: "green" },
        },
      ])
    );
    selectedInstanceSelectorStore.set(["box"]);
    selectedStyleSourceSelectorStore.set({ styleSourceId: "box.local" });

    const { result } = renderHook(() => useStyleInfo());
    expect(getStyleSource(result.current.color)).toEqual("local");
    expect(result.current.color?.value).toEqual({
      type: "keyword",
      value: "green",
    });

    act(() => {
      selectedStyleSourceSelectorStore.set({
        styleSourceId: "box.local",
        state: ":hover",
      });
    });
    expect(getStyleSource(result.current.color)).toEqual("remote");
    expect(result.current.color?.value).toEqual({
      type: "keyword",
      value: "green",
    });
  });

  test("show active state style as local when selected", () => {
    resetStores();
    instancesStore.set(
      toMap([{ type: "instance", id: "box", component: "Box", children: [] }])
    );
    breakpointsStore.set(toMap([{ id: "base", label: "" }]));
    styleSourcesStore.set(toMap([{ id: "box.local", type: "local" }]));
    styleSourceSelectionsStore.set(
      toStyleSourceSelectionsMap([{ instanceId: "box", values: ["box.local"] }])
    );
    stylesStore.set(
      toStylesMap([
        {
          styleSourceId: "box.local",
          breakpointId: "base",
          state: ":hover",
          property: "color",
          value: { type: "keyword", value: "green" },
        },
      ])
    );
    selectedInstanceSelectorStore.set(["box"]);
    selectedStyleSourceSelectorStore.set({ styleSourceId: "box.local" });
    $selectedInstanceStates.set(new Set([":hover"]));

    const { result } = renderHook(() => useStyleInfo());
    expect(getStyleSource(result.current.color)).toEqual("remote");
    expect(result.current.color?.value).toEqual({
      type: "keyword",
      value: "green",
    });

    act(() => {
      selectedStyleSourceSelectorStore.set({
        styleSourceId: "box.local",
        state: ":hover",
      });
    });
    expect(getStyleSource(result.current.color)).toEqual("local");
    expect(result.current.color?.value).toEqual({
      type: "keyword",
      value: "green",
    });
  });

  test("show active state from another breakpoint as remote", () => {
    resetStores();
    instancesStore.set(
      toMap([{ type: "instance", id: "box", component: "Box", children: [] }])
    );
    breakpointsStore.set(
      toMap([
        { id: "base", label: "" },
        { id: "small", label: "", minWidth: 768 },
      ])
    );
    styleSourcesStore.set(toMap([{ id: "box.local", type: "local" }]));
    styleSourceSelectionsStore.set(
      toStyleSourceSelectionsMap([{ instanceId: "box", values: ["box.local"] }])
    );
    stylesStore.set(
      toStylesMap([
        {
          styleSourceId: "box.local",
          breakpointId: "base",
          state: ":hover",
          property: "color",
          value: { type: "keyword", value: "green" },
        },
        // check stateless declaration does not override state
        {
          styleSourceId: "box.local",
          breakpointId: "base",
          property: "color",
          value: { type: "keyword", value: "red" },
        },
      ])
    );
    selectedInstanceSelectorStore.set(["box"]);
    selectedStyleSourceSelectorStore.set({ styleSourceId: "box.local" });
    $selectedBreakpointId.set("small");

    const { result } = renderHook(() => useStyleInfo());
    expect(getStyleSource(result.current.color)).toEqual("remote");
    expect(result.current.color?.value).toEqual({
      type: "keyword",
      value: "red",
    });

    act(() => {
      $selectedInstanceStates.set(new Set([":hover"]));
    });
    expect(getStyleSource(result.current.color)).toEqual("remote");
    expect(result.current.color?.value).toEqual({
      type: "keyword",
      value: "green",
    });
  });

  test("show active state inherited from parent as remote", () => {
    resetStores();
    instancesStore.set(
      toMap([
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [{ type: "id", value: "box" }],
        },
        { type: "instance", id: "box", component: "Box", children: [] },
      ])
    );
    breakpointsStore.set(toMap([{ id: "base", label: "" }]));
    styleSourcesStore.set(toMap([{ id: "body.local", type: "local" }]));
    styleSourceSelectionsStore.set(
      toStyleSourceSelectionsMap([
        { instanceId: "body", values: ["body.local"] },
      ])
    );
    stylesStore.set(
      toStylesMap([
        {
          styleSourceId: "body.local",
          breakpointId: "base",
          state: ":hover",
          property: "color",
          value: { type: "keyword", value: "green" },
        },
        // check stateless declaration does not override state
        {
          styleSourceId: "body.local",
          breakpointId: "base",
          property: "color",
          value: { type: "keyword", value: "red" },
        },
      ])
    );
    selectedInstanceSelectorStore.set(["box", "body"]);

    const { result } = renderHook(() => useStyleInfo());
    expect(getStyleSource(result.current.color)).toEqual("remote");
    expect(result.current.color?.value).toEqual({
      type: "keyword",
      value: "red",
    });

    act(() => {
      $selectedInstanceStates.set(new Set([":hover"]));
    });
    expect(getStyleSource(result.current.color)).toEqual("remote");
    expect(result.current.color?.value).toEqual({
      type: "keyword",
      value: "green",
    });
  });

  test("show active state from the previous token as remote", () => {
    resetStores();
    instancesStore.set(
      toMap([{ type: "instance", id: "box", component: "Box", children: [] }])
    );
    breakpointsStore.set(toMap([{ id: "base", label: "" }]));
    styleSourcesStore.set(
      toMap([
        { id: "box.token", type: "token", name: "" },
        { id: "box.local", type: "local" },
      ])
    );
    styleSourceSelectionsStore.set(
      toStyleSourceSelectionsMap([
        { instanceId: "box", values: ["box.token", "box.local"] },
      ])
    );
    stylesStore.set(
      toStylesMap([
        {
          styleSourceId: "box.token",
          breakpointId: "base",
          state: ":hover",
          property: "color",
          value: { type: "keyword", value: "green" },
        },
        // check stateless declaration does not override state
        {
          styleSourceId: "box.token",
          breakpointId: "base",
          property: "color",
          value: { type: "keyword", value: "red" },
        },
      ])
    );
    selectedInstanceSelectorStore.set(["box"]);
    selectedStyleSourceSelectorStore.set({ styleSourceId: "box.local" });

    const { result } = renderHook(() => useStyleInfo());
    expect(getStyleSource(result.current.color)).toEqual("remote");
    expect(result.current.color?.value).toEqual({
      type: "keyword",
      value: "red",
    });

    act(() => {
      $selectedInstanceStates.set(new Set([":hover"]));
    });
    expect(getStyleSource(result.current.color)).toEqual("remote");
    expect(result.current.color?.value).toEqual({
      type: "keyword",
      value: "green",
    });
  });

  test("show active state from the next token as overwritten", () => {
    resetStores();
    instancesStore.set(
      toMap([{ type: "instance", id: "box", component: "Box", children: [] }])
    );
    breakpointsStore.set(toMap([{ id: "base", label: "" }]));
    styleSourcesStore.set(
      toMap([
        { id: "box.first", type: "token", name: "" },
        { id: "box.second", type: "token", name: "" },
        { id: "box.third", type: "token", name: "" },
      ])
    );
    styleSourceSelectionsStore.set(
      toStyleSourceSelectionsMap([
        { instanceId: "box", values: ["box.first", "box.second", "box.third"] },
      ])
    );
    stylesStore.set(
      toStylesMap([
        {
          styleSourceId: "box.third",
          breakpointId: "base",
          state: ":hover",
          property: "color",
          value: { type: "keyword", value: "green" },
        },
        // check stateless declaration does not override state
        {
          styleSourceId: "box.second",
          breakpointId: "base",
          state: ":hover",
          property: "color",
          value: { type: "keyword", value: "blue" },
        },
      ])
    );
    selectedInstanceSelectorStore.set(["box"]);
    selectedStyleSourceSelectorStore.set({ styleSourceId: "box.first" });
    $selectedInstanceStates.set(new Set([":hover"]));

    const { result } = renderHook(() => useStyleInfo());
    expect(getStyleSource(result.current.color)).toEqual("remote");
    expect(result.current.color?.value).toEqual({
      type: "keyword",
      value: "green",
    });

    act(() => {
      selectedStyleSourceSelectorStore.set({ styleSourceId: "box.second" });
    });
    expect(getStyleSource(result.current.color)).toEqual("overwritten");
    expect(result.current.color?.value).toEqual({
      type: "keyword",
      value: "blue",
    });
  });

  test("show active state from preset", () => {
    resetStores();
    instancesStore.set(
      toMap([{ type: "instance", id: "box", component: "Box", children: [] }])
    );
    breakpointsStore.set(toMap([{ id: "base", label: "" }]));
    styleSourcesStore.set(toMap([{ id: "box.local", type: "local" }]));
    styleSourceSelectionsStore.set(
      toStyleSourceSelectionsMap([{ instanceId: "box", values: ["box.local"] }])
    );
    stylesStore.set(new Map());
    registeredComponentMetasStore.set(
      new Map([
        [
          "Box",
          {
            type: "container",
            icon: "",
            presetStyle: {
              div: [
                {
                  state: ":hover",
                  property: "color",
                  value: { type: "keyword", value: "green" },
                },
                {
                  property: "color",
                  value: { type: "keyword", value: "red" },
                },
              ],
            },
          },
        ],
      ])
    );
    selectedInstanceSelectorStore.set(["box"]);
    $selectedInstanceStates.set(new Set([":hover"]));
    selectedStyleSourceSelectorStore.set({ styleSourceId: "box.local" });
    selectedInstanceIntanceToTagStore.set(new Map([["box", "div"]]));

    const { result } = renderHook(() => useStyleInfo());
    expect(getStyleSource(result.current.color)).toEqual("preset");
    expect(result.current.color?.value).toEqual({
      type: "keyword",
      value: "green",
    });
  });
});
