import { test, expect } from "@jest/globals";
import {
  getStyleDeclKey,
  StyleDecl,
  Styles,
  StyleSourceSelections,
} from "@webstudio-is/project-build";
import { getStyleRules } from "./style-rules";

const createStyleDeclPair = (styleDecl: StyleDecl) => {
  return [getStyleDeclKey(styleDecl), styleDecl] as const;
};

test("compute styles from different style sources", () => {
  const styles: Styles = new Map([
    createStyleDeclPair({
      breakpointId: "a",
      styleSourceId: "styleSource1",
      property: "width",
      value: { type: "unit", value: 10, unit: "px" },
    }),
    createStyleDeclPair({
      breakpointId: "a",
      styleSourceId: "styleSource2",
      property: "display",
      value: { type: "keyword", value: "block" },
    }),
    createStyleDeclPair({
      breakpointId: "a",
      styleSourceId: "styleSource4",
      property: "color",
      value: { type: "keyword", value: "green" },
    }),
    createStyleDeclPair({
      breakpointId: "a",
      styleSourceId: "styleSource4",
      property: "width",
      value: { type: "keyword", value: "min-content" },
    }),
    createStyleDeclPair({
      breakpointId: "a",
      styleSourceId: "styleSource3",
      property: "color",
      value: { type: "keyword", value: "red" },
    }),
    createStyleDeclPair({
      breakpointId: "b",
      styleSourceId: "styleSource5",
      property: "color",
      value: { type: "keyword", value: "orange" },
    }),
    createStyleDeclPair({
      breakpointId: "a",
      styleSourceId: "styleSource6",
      property: "color",
      value: { type: "keyword", value: "blue" },
    }),
  ]);
  const styleSourceSelections: StyleSourceSelections = new Map([
    [
      "instance1",
      {
        instanceId: "instance1",
        values: ["styleSource1"],
      },
    ],
    [
      "instance2",
      {
        instanceId: "instance2",
        values: ["styleSource4", "styleSource5", "styleSource3"],
      },
    ],
    [
      "instance3",
      {
        instanceId: "instance3",
        values: ["styleSource6"],
      },
    ],
  ]);

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
