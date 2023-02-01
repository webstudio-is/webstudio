import { test, expect } from "@jest/globals";
import type { Instance } from "@webstudio-is/project-build";
import { cloneInstance, findSubtree } from "./tree-utils";

const createInstance = (id: string, children: Instance[]): Instance => {
  return {
    type: "instance",
    id,
    component: "Box",
    children: children,
  };
};

test("find subtree with all descendants and parent instance", () => {
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

  expect(findSubtree(rootInstance, "box3")).toEqual({
    parentInstance: createInstance("box2", [
      createInstance("box3", [
        createInstance("child1", []),
        createInstance("child2", [createInstance("descendant", [])]),
        createInstance("child3", []),
      ]),
    ]),
    targetInstance: createInstance("box3", [
      createInstance("child1", []),
      createInstance("child2", [createInstance("descendant", [])]),
      createInstance("child3", []),
    ]),
    subtreeIds: new Set(["box3", "child1", "child2", "child3", "descendant"]),
  });

  expect(findSubtree(rootInstance, "not_found")).toEqual({
    parentInstance: undefined,
    targetInstance: undefined,
    subtreeIds: new Set(),
  });

  expect(findSubtree(rootInstance, "root").parentInstance).toEqual(undefined);
});

test("clone instance tree and provide cloned ids map", () => {
  const instance = createInstance("box", [
    createInstance("child1", []),
    createInstance("child2", [createInstance("descendant", [])]),
    createInstance("child3", []),
  ]);
  const { clonedInstance, clonedIds } = cloneInstance(instance);
  const string = expect.any(String) as unknown as string;
  expect(clonedInstance).toEqual(
    createInstance(string, [
      createInstance(string, []),
      createInstance(string, [createInstance(string, [])]),
      createInstance(string, []),
    ])
  );
  expect(clonedIds.get(instance.id)).toEqual(clonedInstance.id);
  expect(clonedIds.get((instance.children[0] as Instance).id)).toEqual(
    (clonedInstance.children[0] as Instance).id
  );
});
