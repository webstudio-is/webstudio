import { expect, test } from "vitest";
import { elementComponent, type Instance, type Prop } from "@webstudio-is/sdk";
import { createInstanceClonePayload } from "./clone";

const createInstance = (
  id: Instance["id"],
  children: Instance["children"] = []
): Instance => ({
  type: "instance",
  id,
  component: elementComponent,
  children,
});

test("creates instance clone payload with child references and props", () => {
  const targetParent = createInstance("parent", []);
  const props: Prop[] = [
    {
      id: "prop",
      instanceId: "source",
      name: "className",
      type: "string",
      value: "card",
    },
  ];
  const ids = ["source-copy", "child-copy"];

  const result = createInstanceClonePayload({
    instances: new Map([
      [
        "source",
        createInstance("source", [
          { type: "id", value: "child" },
          { type: "text", value: "Text" },
        ]),
      ],
      ["child", createInstance("child")],
      [targetParent.id, targetParent],
    ]),
    sourceInstanceId: "source",
    targetParent,
    insertIndex: 0,
    props,
    styleSourceSelections: [],
    styleSources: [],
    styles: [],
    createId: () => ids.shift() ?? "missing",
  });

  expect(result).toEqual({
    clonedRootId: "source-copy",
    clonedInstanceIds: ["source-copy", "child-copy"],
    payload: [
      {
        namespace: "instances",
        patches: [
          {
            op: "add",
            path: ["source-copy"],
            value: createInstance("source-copy", [
              { type: "id", value: "child-copy" },
              { type: "text", value: "Text" },
            ]),
          },
          {
            op: "add",
            path: ["child-copy"],
            value: createInstance("child-copy"),
          },
          {
            op: "add",
            path: ["parent", "children", 0],
            value: { type: "id", value: "source-copy" },
          },
        ],
      },
      {
        namespace: "props",
        patches: [
          {
            op: "add",
            path: [expect.any(String)],
            value: {
              ...props[0],
              id: expect.any(String),
              instanceId: "source-copy",
            },
          },
        ],
      },
    ],
  });
});
