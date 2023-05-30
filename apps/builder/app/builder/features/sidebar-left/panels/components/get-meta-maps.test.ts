import { type WsComponentMeta } from "@webstudio-is/react-sdk";
import { describe, expect, test } from "@jest/globals";
import { getMetaMaps } from "./get-meta-maps";

const metaByComponentName: Map<string, WsComponentMeta> = new Map([
  [
    "Box",
    {
      category: "general",
      label: "Box",
      type: "container",
      order: 0,
      icon: "",
    },
  ],
  [
    "Box1",
    {
      category: "general",
      label: "Box1",
      type: "container",
      order: 1,
      icon: "",
    },
  ],
]);

describe("getMetaMaps", () => {
  test("sorts meta by order", () => {
    const { metaByCategory, componentNamesByMeta } =
      getMetaMaps(metaByComponentName);
    expect(metaByCategory).toMatchInlineSnapshot(`
      Map {
        "general" => [
          {
            "category": "general",
            "icon": "",
            "label": "Box",
            "order": 0,
            "type": "container",
          },
          {
            "category": "general",
            "icon": "",
            "label": "Box1",
            "order": 1,
            "type": "container",
          },
        ],
      }
    `);
    expect(componentNamesByMeta).toMatchInlineSnapshot(`
      Map {
        {
          "category": "general",
          "icon": "",
          "label": "Box",
          "order": 0,
          "type": "container",
        } => "Box",
        {
          "category": "general",
          "icon": "",
          "label": "Box1",
          "order": 1,
          "type": "container",
        } => "Box1",
      }
    `);
  });
});
