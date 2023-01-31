import { test, expect } from "@jest/globals";
import type {
  NewStyles,
  StyleSourceSelections,
} from "@webstudio-is/project-build";
import { getStyleRules } from "./style-rules";

test("compute styles from different style sources", () => {
  const styles: NewStyles = [
    {
      breakpointId: "a",
      styleSourceId: "styleSource1",
      property: "width",
      value: { type: "unit", value: 10, unit: "px" },
    },
    {
      breakpointId: "a",
      styleSourceId: "styleSource2",
      property: "display",
      value: { type: "keyword", value: "block" },
    },
    {
      breakpointId: "a",
      styleSourceId: "styleSource4",
      property: "color",
      value: { type: "keyword", value: "green" },
    },
    {
      breakpointId: "a",
      styleSourceId: "styleSource4",
      property: "width",
      value: { type: "keyword", value: "min-content" },
    },
    {
      breakpointId: "a",
      styleSourceId: "styleSource3",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
    {
      breakpointId: "b",
      styleSourceId: "styleSource5",
      property: "color",
      value: { type: "keyword", value: "orange" },
    },
    {
      breakpointId: "a",
      styleSourceId: "styleSource6",
      property: "color",
      value: { type: "keyword", value: "blue" },
    },
  ];
  const styleSourceSelections: StyleSourceSelections = [
    {
      instanceId: "instance1",
      values: ["styleSource1"],
    },
    {
      instanceId: "instance2",
      values: ["styleSource4", "styleSource5", "styleSource3"],
    },
    {
      instanceId: "instance3",
      values: ["styleSource6"],
    },
  ];

  expect(getStyleRules(styles, styleSourceSelections)).toMatchInlineSnapshot(`
    [
      {
        "breakpointId": "a",
        "instanceId": "instance1",
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
        "instanceId": "instance2",
        "style": {
          "color": {
            "type": "keyword",
            "value": "red",
          },
          "width": {
            "type": "keyword",
            "value": "min-content",
          },
        },
      },
      {
        "breakpointId": "b",
        "instanceId": "instance2",
        "style": {
          "color": {
            "type": "keyword",
            "value": "orange",
          },
        },
      },
      {
        "breakpointId": "a",
        "instanceId": "instance3",
        "style": {
          "color": {
            "type": "keyword",
            "value": "blue",
          },
        },
      },
    ]
  `);
});
