import { test, expect } from "@jest/globals";
import type { Instance, Props, Styles } from "@webstudio-is/project-build";
import { deleteInstanceMutable } from "./tree-utils";

const createInstance = (id: string, children: Instance[]): Instance => {
  return {
    type: "instance",
    id,
    component: "Box",
    children: children,
  };
};

const createProp = (id: string, instanceId: string): Props[number] => {
  return {
    type: "string",
    id,
    instanceId,
    name: "prop",
    value: "value",
  };
};

const createStyleDecl = (instanceId: string): Styles[number] => {
  return {
    breakpointId: "breakpoint",
    instanceId,
    property: "width",
    value: {
      type: "keyword",
      value: "keyword",
    },
  };
};

test("delete instance with own and descendants styles and props", () => {
  const rootInstance: Instance = createInstance("root", [
    createInstance("box1", []),
    createInstance("box2", [
      createInstance("box3", [
        createInstance("child1", []),
        createInstance("child2", [createInstance("descendant", [])]),
        createInstance("child3", []),
      ]),
    ]),
    createInstance("box4", []),
  ]);
  const props: Props = [
    createProp("1", "root"),
    createProp("2", "box1"),
    createProp("3", "box2"),
    createProp("4", "box3"),
    createProp("7", "child3"),
    createProp("6", "child2"),
    createProp("5", "child1"),
    createProp("8", "descendant"),
    createProp("9", "box4"),
  ];
  const styles: Styles = [
    createStyleDecl("root"),
    createStyleDecl("box1"),
    createStyleDecl("box2"),
    createStyleDecl("box3"),
    createStyleDecl("child3"),
    createStyleDecl("child2"),
    createStyleDecl("child1"),
    createStyleDecl("descendant"),
    createStyleDecl("box4"),
  ];

  deleteInstanceMutable({
    rootInstance,
    props,
    styles,
    deletedInstanceId: "box3",
  });

  expect(rootInstance).toEqual(
    createInstance("root", [
      createInstance("box1", []),
      createInstance("box2", []),
      createInstance("box4", []),
    ])
  );
  expect(props).toEqual([
    createProp("1", "root"),
    createProp("2", "box1"),
    createProp("3", "box2"),
    createProp("9", "box4"),
  ]);
  expect(styles).toEqual([
    createStyleDecl("root"),
    createStyleDecl("box1"),
    createStyleDecl("box2"),
    createStyleDecl("box4"),
  ]);
});
