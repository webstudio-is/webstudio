import type {
  Breakpoints,
  Instance,
  StyleDecl,
} from "@webstudio-is/project-build";
import { createInstancesIndex } from "~/shared/tree-utils";
import {
  getCascadedBreakpointIds,
  getCascadedInfo,
  getInheritedInfo,
} from "./style-info";

const breakpoints: Breakpoints = new Map([
  ["1", { id: "1", label: "1", minWidth: 0 }],
  ["2", { id: "2", label: "2", minWidth: 768 }],
  ["3", { id: "3", label: "3", minWidth: 1280 }],
  ["4", { id: "4", label: "4", minWidth: 1920 }],
]);

const selectedBreakpointId = "3";
const selectedInstanceId = "3";
const cascadedBreakpointIds = getCascadedBreakpointIds(
  breakpoints,
  selectedBreakpointId
);

const cascadingStylesByInstanceId = new Map<Instance["id"], StyleDecl[]>();
cascadingStylesByInstanceId.set(selectedInstanceId, [
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

const rootInstance: Instance = {
  type: "instance",
  id: "1",
  component: "Body",
  children: [
    {
      type: "instance",
      id: "2",
      component: "Box",
      children: [
        {
          type: "instance",
          id: "3",
          component: "Box",
          children: [],
        },
      ],
    },
  ],
};

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
      selectedInstanceId,
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
  const instancesIndex = createInstancesIndex(rootInstance);
  expect(
    getInheritedInfo(
      instancesIndex,
      inheritingStylesByInstanceId,
      selectedInstanceId,
      cascadedBreakpointIds,
      selectedBreakpointId
    )
  ).toMatchInlineSnapshot(`
    {
      "fontSize": {
        "instanceId": "1",
        "value": {
          "type": "unit",
          "unit": "px",
          "value": 20,
        },
      },
      "fontWeight": {
        "instanceId": "2",
        "value": {
          "type": "keyword",
          "value": "600",
        },
      },
    }
  `);
});
