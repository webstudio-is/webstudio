import { describe, test, expect } from "@jest/globals";
import type { WsComponentMeta } from "@webstudio-is/react-sdk";
import * as defaultMetas from "@webstudio-is/sdk-components-react/metas";
import type { Instance, Instances } from "@webstudio-is/project-build";
import {
  findClosestDroppableComponentIndex,
  findClosestDroppableTarget,
  findClosestEditableInstanceSelector,
} from "./instance-utils";

const defaultMetasMap = new Map(Object.entries(defaultMetas));

const createFakeComponentMetas = (
  itemMeta: Partial<WsComponentMeta>,
  anotherItemMeta?: Partial<WsComponentMeta>
): Map<string, WsComponentMeta> => {
  const base = {
    label: "",
    Icon: () => null,
  };
  const configs = {
    Item: { ...base, type: "container", ...itemMeta },
    AnotherItem: { ...base, type: "container", ...anotherItemMeta },
    Bold: { ...base, type: "rich-text-child" },
    TextBlock: { ...base, type: "container" },
    Form: { ...base, type: "container" },
    Box: { ...base, type: "container" },
    Div: { ...base, type: "container" },
    Body: { ...base, type: "container" },
  } as const;
  return new Map(Object.entries(configs)) as Map<string, WsComponentMeta>;
};

const createInstancePair = (
  id: Instance["id"],
  component: string,
  children: Instance["children"]
): [Instance["id"], Instance] => {
  return [id, { type: "instance", id, component, children }];
};

describe("find closest editable instance selector", () => {
  test("searches closest container", () => {
    const instances: Instances = new Map([
      createInstancePair("body", "Body", [{ type: "id", value: "box" }]),
      createInstancePair("box", "Box", [
        { type: "text", value: "some text" },
        { type: "id", value: "bold" },
      ]),
      createInstancePair("bold", "Bold", [
        { type: "text", value: "some-bold" },
      ]),
    ]);
    expect(
      findClosestEditableInstanceSelector(
        ["bold", "box", "body"],
        instances,
        createFakeComponentMetas({})
      )
    ).toEqual(["box", "body"]);
    expect(
      findClosestEditableInstanceSelector(
        ["box", "body"],
        instances,
        createFakeComponentMetas({})
      )
    ).toEqual(["box", "body"]);
  });

  test("skips when container has anything except rich-text-child or text", () => {
    const instances: Instances = new Map([
      createInstancePair("body", "Body", [{ type: "id", value: "box" }]),
      createInstancePair("box", "Box", [
        { type: "text", value: "some text" },
        { type: "id", value: "bold" },
        { type: "id", value: "child-box" },
      ]),
      createInstancePair("bold", "Bold", [
        { type: "text", value: "some-bold" },
      ]),
      createInstancePair("child-box", "Box", [
        { type: "text", value: "child-box" },
      ]),
    ]);
    expect(
      findClosestEditableInstanceSelector(
        ["bold", "box", "body"],
        instances,
        createFakeComponentMetas({})
      )
    ).toEqual(undefined);
  });

  test("considers empty container as editable", () => {
    const instances: Instances = new Map([
      createInstancePair("body", "Body", []),
    ]);
    expect(
      findClosestEditableInstanceSelector(
        ["body"],
        instances,
        createFakeComponentMetas({})
      )
    ).toEqual(["body"]);
  });
});

describe("find closest droppable component index", () => {
  test("finds container", () => {
    expect(
      findClosestDroppableComponentIndex(
        createFakeComponentMetas({}),
        ["Box", "Body"],
        ["Item"]
      )
    ).toEqual(0);
  });

  test("skips non containers", () => {
    expect(
      findClosestDroppableComponentIndex(
        createFakeComponentMetas({}),
        ["Bold", "Italic", "TextBlock", "Box", "Body"],
        ["Item"]
      )
    ).toEqual(2);
  });

  test("can be dropped into itself", () => {
    expect(
      findClosestDroppableComponentIndex(
        createFakeComponentMetas({}),
        ["Box", "Item", "Body"],
        ["Item"]
      )
    ).toEqual(0);
  });

  test("can be forbidden to drop into itself", () => {
    expect(
      findClosestDroppableComponentIndex(
        createFakeComponentMetas({
          invalidAncestors: ["Item"],
        }),
        ["Box", "Item", "Body"],
        ["Item"]
      )
    ).toEqual(2);
  });

  test("requires some ancestor", () => {
    expect(
      findClosestDroppableComponentIndex(
        createFakeComponentMetas({
          requiredAncestors: ["Form"],
        }),
        ["Box", "Body"],
        ["Item"]
      )
    ).toEqual(-1);
    expect(
      findClosestDroppableComponentIndex(
        createFakeComponentMetas({
          requiredAncestors: ["Form"],
        }),
        ["Box", "Form", "Body"],
        ["Item"]
      )
    ).toEqual(0);
  });

  test("considers both required and invalid ancestors", () => {
    expect(
      findClosestDroppableComponentIndex(
        createFakeComponentMetas({
          requiredAncestors: ["Form"],
          invalidAncestors: ["Box"],
        }),
        ["Div", "Box", "Form", "Body"],
        ["Item"]
      )
    ).toEqual(2);
    expect(
      findClosestDroppableComponentIndex(
        createFakeComponentMetas({
          requiredAncestors: ["Form"],
          invalidAncestors: ["Box"],
        }),
        ["Div", "Form", "Box", "Body"],
        ["Item"]
      )
    ).toEqual(-1);
  });

  test("considers multiple children", () => {
    expect(
      findClosestDroppableComponentIndex(
        createFakeComponentMetas(
          {
            requiredAncestors: ["Form"],
          },
          {
            requiredAncestors: ["Box"],
          }
        ),
        ["Div", "Form", "Body"],
        ["Item", "AnotherItem"]
      )
    ).toEqual(0);
    expect(
      findClosestDroppableComponentIndex(
        createFakeComponentMetas(
          {
            requiredAncestors: ["Form"],
          },
          {
            requiredAncestors: ["Box"],
          }
        ),
        ["Div", "Box", "Body"],
        ["Item", "AnotherItem"]
      )
    ).toEqual(0);
  });
});

describe("find closest droppable target", () => {
  const createInstancePair = (
    id: Instance["id"],
    component: string,
    children: Instance["children"]
  ): [Instance["id"], Instance] => {
    return [id, { type: "instance", id, component, children }];
  };

  test("puts in the end if closest instance is container", () => {
    const instances = new Map([
      createInstancePair("body", "Body", [{ type: "id", value: "box" }]),
      createInstancePair("box", "Box", [{ type: "id", value: "paragraph" }]),
      createInstancePair("paragraph", "Paragraph", [
        { type: "id", value: "bold" },
      ]),
    ]);
    expect(
      findClosestDroppableTarget(
        defaultMetasMap,
        instances,
        ["box", "body"],
        ["Box"]
      )
    ).toEqual({
      parentSelector: ["box", "body"],
      position: "end",
    });
    expect(
      findClosestDroppableTarget(
        defaultMetasMap,
        instances,
        ["not-existing", "body"],
        ["Box"]
      )
    ).toEqual(undefined);
  });

  test("puts in the end of root instance", () => {
    const instances = new Map([
      createInstancePair("body", "Body", [{ type: "id", value: "box" }]),
      createInstancePair("box", "Box", [{ type: "id", value: "paragraph" }]),
    ]);
    expect(
      findClosestDroppableTarget(defaultMetasMap, instances, ["body"], ["Box"])
    ).toEqual({
      parentSelector: ["body"],
      position: "end",
    });
  });

  test("finds closest container and puts after its child within selection", () => {
    const instances = new Map([
      createInstancePair("body", "Body", [{ type: "id", value: "paragraph" }]),
      createInstancePair("paragraph", "Paragraph", [
        { type: "id", value: "bold" },
      ]),
      createInstancePair("bold", "Bold", []),
    ]);
    expect(
      findClosestDroppableTarget(
        defaultMetasMap,
        instances,
        ["bold", "paragraph", "body"],
        ["Box"]
      )
    ).toEqual({
      parentSelector: ["paragraph", "body"],
      position: 1,
    });
  });

  test("puts multiple children", () => {
    const instances = new Map([
      createInstancePair("body", "Body", [{ type: "id", value: "box" }]),
      createInstancePair("box", "Box", [{ type: "id", value: "bold" }]),
      createInstancePair("bold", "Bold", []),
    ]);
    expect(
      findClosestDroppableTarget(
        defaultMetasMap,
        instances,
        ["bold", "box", "body"],
        ["Box", "Form"]
      )
    ).toEqual({
      parentSelector: ["box", "body"],
      position: 1,
    });
  });
});
