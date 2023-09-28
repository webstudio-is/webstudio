import { describe, expect, test } from "@jest/globals";
import {
  EmbedTemplateInstance,
  WsEmbedTemplate,
} from "@webstudio-is/react-sdk";
import { tailwindToWebstudio } from "./tw-to-ws";

const testTemplate = (classname?: string): WsEmbedTemplate => [
  {
    type: "text",
    value: "test",
  },
  {
    type: "instance",
    component: "Box",
    props: [
      {
        type: "string",
        name: "className",
        value:
          typeof classname === "string"
            ? classname
            : "mx-10 block flex flex-col border-1 bg-red-500 text-semibold text-white",
      },
    ],
    children: [],
  },
];

describe("tw-to-ws", () => {
  test("convert tailwind className to Webstudio styles", async () => {
    const template = testTemplate();

    await tailwindToWebstudio(template);

    expect(() => WsEmbedTemplate.parse(template)).not.toThrow();
    expect(
      Array.isArray((template[1] as EmbedTemplateInstance).props)
    ).toBeTruthy();
    expect(
      (template[1] as EmbedTemplateInstance).props?.find(
        (prop) => prop.name === "className"
      )
    ).toBeUndefined();

    expect((template[1] as EmbedTemplateInstance).styles)
      .toMatchInlineSnapshot(`
[
  {
    "property": "marginLeft",
    "value": {
      "type": "unit",
      "unit": "rem",
      "value": 2.5,
    },
  },
  {
    "property": "marginRight",
    "value": {
      "type": "unit",
      "unit": "rem",
      "value": 2.5,
    },
  },
  {
    "property": "display",
    "value": {
      "type": "keyword",
      "value": "block",
    },
  },
  {
    "property": "display",
    "value": {
      "type": "keyword",
      "value": "flex",
    },
  },
  {
    "property": "flexDirection",
    "value": {
      "type": "keyword",
      "value": "column",
    },
  },
  {
    "property": "borderWidth",
    "value": {
      "type": "unit",
      "unit": "px",
      "value": 1,
    },
  },
  {
    "property": "backgroundColor",
    "value": {
      "alpha": 1,
      "b": 68,
      "g": 68,
      "r": 239,
      "type": "rgb",
    },
  },
  {
    "property": "color",
    "value": {
      "alpha": 1,
      "b": 255,
      "g": 255,
      "r": 255,
      "type": "rgb",
    },
  },
]
`);
  });

  test("merges styles (existing local styles override tailwind)", async () => {
    const template = testTemplate();

    (template[1] as EmbedTemplateInstance).styles = [
      {
        property: "display",
        value: {
          type: "keyword",
          value: "block",
        },
      },
    ];

    await tailwindToWebstudio(template);

    expect(() => WsEmbedTemplate.parse(template)).not.toThrow();
    expect(
      (template[1] as EmbedTemplateInstance).styles?.filter(
        (decl) => decl.property === "display"
      )
    ).toHaveLength(1);
  });
});
