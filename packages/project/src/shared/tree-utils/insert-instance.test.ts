import { describe, test, expect } from "@jest/globals";
import { type Instance } from "@webstudio-is/react-sdk";
import { insertInstanceMutable } from "./insert-instance";
import { createInstance } from "./create-instance";

const instance = createInstance({ id: "3", component: "Box" });

describe("Insert instance", () => {
  test(`inside a nested div using "end": div 1 > div 2 > [div 3]`, () => {
    const rootInstance: Instance = {
      type: "instance",
      component: "Box",
      id: "1",
      children: [
        {
          type: "instance",
          component: "Box",
          id: "2",
          children: [],
        },
      ],
    };

    const hasInserted = insertInstanceMutable(rootInstance, instance, {
      parentId: "2",
      position: "end",
    });
    expect(hasInserted).toBeTruthy();
    expect(rootInstance).toMatchSnapshot();
  });

  test("after a nested div using index: div 1 > div 2, [div 3]", () => {
    const rootInstance: Instance = {
      type: "instance",
      component: "Box",
      id: "1",
      children: [
        {
          type: "instance",
          component: "Box",
          id: "2",
          children: [],
        },
      ],
    };

    const hasInserted = insertInstanceMutable(rootInstance, instance, {
      parentId: "1",
      position: 1,
    });
    expect(hasInserted).toBeTruthy();
    expect(rootInstance).toMatchSnapshot();
  });

  test("before a nested div using index: div 1 > [div 3], div 2", () => {
    const rootInstance: Instance = {
      type: "instance",
      component: "Box",
      id: "1",
      children: [
        {
          type: "instance",
          component: "Box",
          id: "2",
          children: [],
        },
      ],
    };
    const hasInserted = insertInstanceMutable(rootInstance, instance, {
      parentId: "1",
      position: 0,
    });
    expect(hasInserted).toBeTruthy();
    expect(rootInstance).toMatchSnapshot();
  });

  test(`after a nested div using "end": div 1 > div 2, [div 3]`, () => {
    const rootInstance: Instance = {
      type: "instance",
      component: "Box",
      id: "1",
      children: [
        {
          type: "instance",
          component: "Box",
          id: "2",
          children: [],
        },
      ],
    };

    const hasInserted = insertInstanceMutable(rootInstance, instance, {
      parentId: "1",
      position: "end",
    });
    expect(hasInserted).toBeTruthy();
    expect(rootInstance).toMatchSnapshot();
  });
});
