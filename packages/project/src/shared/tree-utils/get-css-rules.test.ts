import { type Instance } from "@webstudio-is/react-sdk";
import { getCssRules } from "./get-css-rules";

describe("Get all cssRules from an instance including children", () => {
  test("getCssRules", () => {
    const rootInstance: Instance = {
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
      Array [
        Array [
          "1",
          Object {
            "breakpoint": "a",
            "style": Object {
              "width": Object {
                "type": "unit",
                "unit": "px",
                "value": 10,
              },
            },
          },
        ],
        Array [
          "2",
          Object {
            "breakpoint": "a",
            "style": Object {
              "display": Object {
                "type": "keyword",
                "value": "block",
              },
            },
          },
        ],
        Array [
          "3",
          Object {
            "breakpoint": "a",
            "style": Object {
              "color": Object {
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
