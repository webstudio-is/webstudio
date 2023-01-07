import { test, expect } from "@jest/globals";
import type { Styles } from "@webstudio-is/react-sdk";
import { getStyleRules, getPresetStyleRules } from "./style-rules";

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

test("get a list of preset styles grouped by component", () => {
  expect(
    getPresetStyleRules([
      {
        component: "Box",
        property: "width",
        value: { type: "keyword", value: "auto" },
      },
      {
        component: "Box",
        property: "height",
        value: { type: "keyword", value: "auto" },
      },
      {
        component: "Paragraph",
        property: "width",
        value: { type: "keyword", value: "auto" },
      },
    ])
  ).toMatchInlineSnapshot(`
    [
      {
        "component": "Box",
        "style": {
          "height": {
            "type": "keyword",
            "value": "auto",
          },
          "width": {
            "type": "keyword",
            "value": "auto",
          },
        },
      },
      {
        "component": "Paragraph",
        "style": {
          "width": {
            "type": "keyword",
            "value": "auto",
          },
        },
      },
    ]
  `);
});
