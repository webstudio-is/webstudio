import { type Instance } from "@webstudio-is/sdk";
import { type InstanceInsertionSpec } from ".";
import { insertInstance } from "./insert-instance";

describe("Insert instance", () => {
  test(`inside a nested div using "end": div 1 > div 2 > [div 3]`, () => {
    const instance: Instance = {
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
      parentId: "2",
      component: "Box",
      position: "end",
      id: "3",
    };
    const result = insertInstance(instanceInsertionSpec, instance);
    expect(result).toMatchSnapshot();
  });

  test("after a nested div using index: div 1 > div 2, [div 3]", () => {
    const instance: Instance = {
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
      parentId: "1",
      component: "Box",
      position: 1,
      id: "3",
    };
    const result = insertInstance(instanceInsertionSpec, instance);
    expect(result).toMatchSnapshot();
  });

  test("before a nested div using index: div 1 > [div 3], div 2", () => {
    const instance: Instance = {
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
      parentId: "1",
      component: "Box",
      position: 0,
      id: "3",
    };
    const result = insertInstance(instanceInsertionSpec, instance);
    expect(result).toMatchSnapshot();
  });

  test(`after a nested div using "end": div 1 > div 2, [div 3]`, () => {
    const instance: Instance = {
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
      parentId: "1",
      component: "Box",
      position: "end",
      id: "3",
    };
    const result = insertInstance(instanceInsertionSpec, instance);
    expect(result).toMatchSnapshot();
  });
});
