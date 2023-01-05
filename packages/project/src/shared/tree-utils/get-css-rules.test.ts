import { describe, test, expect } from "@jest/globals";
import { type Instance } from "@webstudio-is/react-sdk";
import { getCssRules, getPresetStylesMap } from "./get-css-rules";

describe("Get all cssRules from an instance including children", () => {
  test("getCssRules", () => {
    const rootInstance: Instance = {
      type: "instance",
      component: "Box",
      id: "1",
      cssRules: [
        {
          style: { width: { type: "unit", value: 10, unit: "px" } },
          breakpoint: "a",
        },
      ],
      children: [
        {
          type: "instance",
          component: "Box",
          id: "2",
          cssRules: [
            {
              style: { display: { type: "keyword", value: "block" } },
              breakpoint: "a",
            },
          ],
          children: [
            {
              type: "instance",
              component: "Box",
              id: "3",
              cssRules: [
                {
                  style: { color: { type: "keyword", value: "red" } },
                  breakpoint: "a",
                },
              ],
              children: [],
            },
          ],
        },
      ],
    };

    expect(getCssRules(rootInstance)).toMatchInlineSnapshot(`
      [
        [
          "1",
          {
            "breakpoint": "a",
            "style": {
              "width": {
                "type": "unit",
                "unit": "px",
                "value": 10,
              },
            },
          },
        ],
        [
          "2",
          {
            "breakpoint": "a",
            "style": {
              "display": {
                "type": "keyword",
                "value": "block",
              },
            },
          },
        ],
        [
          "3",
          {
            "breakpoint": "a",
            "style": {
              "color": {
                "type": "keyword",
                "value": "red",
              },
            },
          },
        ],
      ]
    `);
  });
});

test("get a map of preset style objects per component", () => {
  expect(
    getPresetStylesMap([
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
    Map {
      "Box" => {
        "height": {
          "type": "keyword",
          "value": "auto",
        },
        "width": {
          "type": "keyword",
          "value": "auto",
        },
      },
      "Paragraph" => {
        "width": {
          "type": "keyword",
          "value": "auto",
        },
      },
    }
  `);
});
