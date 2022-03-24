import { type Instance } from "@webstudio-is/sdk";
import { insertInstance, type InstanceInsertionSpec } from "./insert-instance";
import { createInstance } from "./create-instance";

const instance = createInstance({ id: "3", component: "Box" });

describe("Insert instance", () => {
  test(`inside a nested div using "end": div 1 > div 2 > [div 3]`, () => {
    const rootInstance: Instance = {
      component: "Box",
      id: "1",
      style: {},
      children: [
        {
          component: "Box",
          id: "2",
          style: {},
          children: [],
        },
      ],
    };
    const instanceInsertionSpec: InstanceInsertionSpec = {
      instance,
      parentId: "2",
      position: "end",
    };
    const result = insertInstance(instanceInsertionSpec, rootInstance);
    expect(result).toMatchSnapshot();
  });

  test("after a nested div using index: div 1 > div 2, [div 3]", () => {
    const rootInstance: Instance = {
      component: "Box",
      id: "1",
      style: {},
      children: [
        {
          component: "Box",
          id: "2",
          style: {},
          children: [],
        },
      ],
    };
    const instanceInsertionSpec: InstanceInsertionSpec = {
      instance,
      parentId: "1",
      position: 1,
    };
    const result = insertInstance(instanceInsertionSpec, rootInstance);
    expect(result).toMatchSnapshot();
  });

  test("before a nested div using index: div 1 > [div 3], div 2", () => {
    const rootInstance: Instance = {
      component: "Box",
      id: "1",
      style: {},
      children: [
        {
          component: "Box",
          id: "2",
          style: {},
          children: [],
        },
      ],
    };
    const instanceInsertionSpec: InstanceInsertionSpec = {
      instance,
      parentId: "1",
      position: 0,
    };
    const result = insertInstance(instanceInsertionSpec, rootInstance);
    expect(result).toMatchSnapshot();
  });

  test(`after a nested div using "end": div 1 > div 2, [div 3]`, () => {
    const rootInstance: Instance = {
      component: "Box",
      id: "1",
      style: {},
      children: [
        {
          component: "Box",
          id: "2",
          style: {},
          children: [],
        },
      ],
    };
    const instanceInsertionSpec: InstanceInsertionSpec = {
      instance,
      parentId: "1",
      position: "end",
    };
    const result = insertInstance(instanceInsertionSpec, rootInstance);
    expect(result).toMatchSnapshot();
  });
});
