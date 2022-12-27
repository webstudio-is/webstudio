import type { Breakpoint, CssRule } from "@webstudio-is/css-data";
import type { Instance } from "@webstudio-is/react-sdk";
import {
  getCascadedBreakpointIds,
  getCascadedInfo,
  getInheritedInfo,
} from "./style-info";

const breakpoints: Breakpoint[] = [
  {
    id: "1",
    label: "1",
    minWidth: 0,
  },
  {
    id: "2",
    label: "2",
    minWidth: 768,
  },
  {
    id: "3",
    label: "3",
    minWidth: 1280,
  },
  {
    id: "4",
    label: "4",
    minWidth: 1920,
  },
];

const selectedBreakpointId = "3";
const cascadedBreakpointIds = getCascadedBreakpointIds(
  breakpoints,
  selectedBreakpointId
);

const cssRules: CssRule[] = [
  {
    breakpoint: "1",
    style: {
      width: { type: "unit", value: 100, unit: "px" },
      height: { type: "unit", value: 50, unit: "px" },
    },
  },
  {
    breakpoint: "2",
    style: {
      width: { type: "unit", value: 200, unit: "px" },
    },
  },
  {
    breakpoint: "3",
    style: {
      // should not be computed because current breakpoint
      height: { type: "unit", value: 150, unit: "px" },
    },
  },
  {
    breakpoint: "4",
    style: {
      width: { type: "unit", value: 400, unit: "px" },
    },
  },
];

const rootInstance: Instance = {
  type: "instance",
  id: "1",
  component: "Body",
  cssRules: [
    {
      breakpoint: "1",
      style: {
        // should be inherited even from another breakpoint
        fontSize: { type: "unit", value: 20, unit: "px" },
      },
    },
  ],
  children: [
    {
      type: "instance",
      id: "2",
      component: "Box",
      cssRules: [
        {
          breakpoint: "3",
          style: {
            // should not be inherited because width is not inheritable
            width: { type: "unit", value: 100, unit: "px" },
            // should be inherited from selected breakpoint
            fontWeight: { type: "keyword", value: "600" },
          },
        },
      ],
      children: [
        {
          type: "instance",
          id: "3",
          component: "Box",
          cssRules: [
            {
              breakpoint: "3",
              style: {
                // should not show selected style as inherited
                fontWeight: { type: "keyword", value: "500" },
              },
            },
          ],
          children: [],
        },
      ],
    },
  ],
};
const selectedInstanceId = "3";

test("compute cascaded styles", () => {
  expect(getCascadedInfo(cssRules, cascadedBreakpointIds))
    .toMatchInlineSnapshot(`
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
      rootInstance,
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
