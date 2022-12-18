import { test, expect } from "@jest/globals";
import {
  normalizeTree,
  denormalizeTree,
  Instance,
  NormalizedInstance,
} from "./instance";

const createInstance = (
  id: string,
  children: (string | Instance)[]
): Instance => {
  return {
    id,
    component: "Box",
    cssRules: [],
    children,
  };
};

const createNormalizedInstance = (
  id: string,
  children: (string | number)[]
): NormalizedInstance => {
  return {
    id,
    component: "Box",
    cssRules: [],
    children,
  };
};

const testDenormalizedTree = createInstance("1", [
  createInstance("2", ["text", createInstance("3", [])]),
  createInstance("4", []),
]);

test("normalizeTree", () => {
  expect(normalizeTree(testDenormalizedTree)).toMatchInlineSnapshot(`
    [
      {
        "children": [
          1,
          3,
        ],
        "component": "Box",
        "cssRules": [],
        "id": "1",
      },
      {
        "children": [
          "text",
          2,
        ],
        "component": "Box",
        "cssRules": [],
        "id": "2",
      },
      {
        "children": [],
        "component": "Box",
        "cssRules": [],
        "id": "3",
      },
      {
        "children": [],
        "component": "Box",
        "cssRules": [],
        "id": "4",
      },
    ]
  `);
});

test("denormalizeTree", () => {
  expect(
    denormalizeTree([
      createNormalizedInstance("1", [1, 3]),
      createNormalizedInstance("2", ["text", 2]),
      createNormalizedInstance("3", []),
      createNormalizedInstance("4", []),
    ])
  ).toMatchInlineSnapshot(`
    {
      "children": [
        {
          "children": [
            "text",
            {
              "children": [],
              "component": "Box",
              "cssRules": [],
              "id": "3",
            },
          ],
          "component": "Box",
          "cssRules": [],
          "id": "2",
        },
        {
          "children": [],
          "component": "Box",
          "cssRules": [],
          "id": "4",
        },
      ],
      "component": "Box",
      "cssRules": [],
      "id": "1",
    }
  `);
});

test("reversable", () => {
  expect(denormalizeTree(normalizeTree(testDenormalizedTree))).toEqual(
    testDenormalizedTree
  );
});
