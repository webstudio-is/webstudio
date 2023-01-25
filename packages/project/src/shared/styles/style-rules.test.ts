import { test, expect } from "@jest/globals";
import type { Styles } from "@webstudio-is/react-sdk";
import { getStyleRules } from "./style-rules";

test("get a list of style rules grouped by instance and breakpoint", () => {
  const styles: Styles = [
    {
      breakpointId: "a",
      instanceId: "1",
      property: "width",
      value: { type: "unit", value: 10, unit: "px" },
    },
    {
      breakpointId: "a",
      instanceId: "2",
      property: "display",
      value: { type: "keyword", value: "block" },
    },
    {
      breakpointId: "a",
      instanceId: "3",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ];

  expect(getStyleRules(styles)).toMatchInlineSnapshot(`
    [
      {
        "breakpointId": "a",
        "instanceId": "1",
        "style": {
          "width": {
            "type": "unit",
            "unit": "px",
            "value": 10,
          },
        },
      },
      {
        "breakpointId": "a",
        "instanceId": "2",
        "style": {
          "display": {
            "type": "keyword",
            "value": "block",
          },
        },
      },
      {
        "breakpointId": "a",
        "instanceId": "3",
        "style": {
          "color": {
            "type": "keyword",
            "value": "red",
          },
        },
      },
    ]
  `);
});
