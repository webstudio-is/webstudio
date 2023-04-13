import { test, expect } from "@jest/globals";
import { createHeadlessEditor } from "@lexical/headless";
import { LinkNode } from "@lexical/link";
import type { Instance } from "@webstudio-is/project-build";
import { $convertToLexical, $convertToUpdates, type Refs } from "./interop";

const createInstance = (
  id: Instance["id"],
  component: string,
  children: Instance["children"]
) => {
  return {
    type: "instance",
    id,
    component,
    children,
  };
};

const createInstancePair = (
  id: Instance["id"],
  component: string,
  children: Instance["children"]
): [Instance["id"], Instance] => {
  return [
    id,
    {
      type: "instance",
      id,
      component,
      children,
    },
  ];
};

const instances = new Map([
  createInstancePair("1", "Body", [
    { type: "id", value: "2" },
    { type: "id", value: "3" },
  ]),
  createInstancePair("2", "Box", []),
  createInstancePair("3", "Box", [
    { type: "text", value: "Hello" },
    { type: "text", value: "\n" },
    { type: "id", value: "4" },
    { type: "text", value: "\n" },
    { type: "id", value: "6" },
    { type: "text", value: "\n" },
    { type: "id", value: "7" },
  ]),
  createInstancePair("4", "Bold", [{ type: "id", value: "5" }]),
  createInstancePair("5", "Italic", [{ type: "text", value: "world" }]),
  createInstancePair("6", "Span", [{ type: "text", value: "and" }]),
  createInstancePair("7", "RichTextLink", [
    { type: "text", value: "other realms" },
  ]),
]);

const expectedRefs = new Map([
  ["4:bold", "4"],
  ["4:italic", "5"],
  ["6:span", "6"],
  ["8", "7"],
]);

test("convert instances to lexical", async () => {
  const refs: Refs = new Map();
  const editor = createHeadlessEditor({
    nodes: [LinkNode],
  });
  await new Promise<void>((resolve) => {
    editor.update(
      () => {
        $convertToLexical(instances, "3", refs);
      },
      { onUpdate: resolve }
    );
  });

  expect(editor.getEditorState().toJSON()).toMatchInlineSnapshot(`
    {
      "root": {
        "children": [
          {
            "children": [
              {
                "detail": 0,
                "format": 0,
                "mode": "normal",
                "style": "",
                "text": "Hello",
                "type": "text",
                "version": 1,
              },
              {
                "type": "linebreak",
                "version": 1,
              },
              {
                "detail": 0,
                "format": 3,
                "mode": "normal",
                "style": "",
                "text": "world",
                "type": "text",
                "version": 1,
              },
              {
                "type": "linebreak",
                "version": 1,
              },
              {
                "detail": 0,
                "format": 0,
                "mode": "normal",
                "style": "--style-node-trigger:;",
                "text": "and",
                "type": "text",
                "version": 1,
              },
              {
                "type": "linebreak",
                "version": 1,
              },
              {
                "children": [
                  {
                    "detail": 0,
                    "format": 0,
                    "mode": "normal",
                    "style": "",
                    "text": "other realms",
                    "type": "text",
                    "version": 1,
                  },
                ],
                "direction": null,
                "format": "",
                "indent": 0,
                "rel": null,
                "target": null,
                "type": "link",
                "url": "",
                "version": 1,
              },
            ],
            "direction": null,
            "format": "",
            "indent": 0,
            "type": "paragraph",
            "version": 1,
          },
        ],
        "direction": null,
        "format": "",
        "indent": 0,
        "type": "root",
        "version": 1,
      },
    }
  `);

  expect(refs).toEqual(expectedRefs);
});

test("convert lexical to instances updates", async () => {
  const refs: Refs = new Map();
  const editor = createHeadlessEditor({
    nodes: [LinkNode],
  });
  await new Promise<void>((resolve) => {
    editor.update(
      () => {
        $convertToLexical(instances, "3", refs);
      },
      { onUpdate: resolve }
    );
  });
  const treeRootInstance = instances.get("3");
  if (treeRootInstance === undefined) {
    throw Error("Tree root instance should be in test data");
  }

  const updates = editor.getEditorState().read(() => {
    return $convertToUpdates(treeRootInstance, refs);
  });

  expect(updates).toEqual([
    createInstance("3", "Box", [
      { type: "text", value: "Hello" },
      { type: "text", value: "\n" },
      { type: "id", value: "4" },
      { type: "text", value: "\n" },
      { type: "id", value: "6" },
      { type: "text", value: "\n" },
      { type: "id", value: "7" },
    ]),
    createInstance("4", "Bold", [{ type: "id", value: "5" }]),
    createInstance("5", "Italic", [{ type: "text", value: "world" }]),
    createInstance("6", "Span", [{ type: "text", value: "and" }]),
    createInstance("7", "RichTextLink", [
      { type: "text", value: "other realms" },
    ]),
  ]);
});
