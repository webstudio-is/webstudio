import { type Instance } from "@webstudio-is/sdk";
import type { DropData } from "~/shared/canvas-components";
import { createInsertionSpec } from "./create-insertion-spec";

describe("Create insertion spec", () => {
  test("dropData.instance first level can accept child", () => {
    const rootInstance: Instance = {
      component: "Box",
      id: "1",
      cssRules: [],
      children: [],
    };

    const dropData: DropData = {
      instance: rootInstance,
      position: 0,
    };

    const spec = createInsertionSpec({ dropData, rootInstance });
    expect(spec).toEqual({ parentId: "1", position: 0 });
  });

  test("dropData.instance nested can accept child", () => {
    const targetInstance: Instance = {
      component: "Box",
      id: "2",
      cssRules: [],
      children: [],
    };

    const rootInstance: Instance = {
      component: "Box",
      id: "1",
      cssRules: [],
      children: [targetInstance],
    };

    const dropData: DropData = {
      instance: targetInstance,
      position: 0,
    };

    const spec = createInsertionSpec({ dropData, rootInstance });
    expect(spec).toEqual({ parentId: "2", position: 0 });
  });

  test("dropData.instance can't accept child, fallback to parent", () => {
    const targetInstance: Instance = {
      component: "Heading",
      id: "3",
      cssRules: [],
      children: [],
    };

    const rootInstance: Instance = {
      component: "Box",
      id: "1",
      cssRules: [],
      children: [
        {
          component: "Box",
          id: "2",
          cssRules: [],
          children: [targetInstance],
        },
      ],
    };

    const dropData: DropData = {
      instance: targetInstance,
      position: 0,
    };

    const spec = createInsertionSpec({ dropData, rootInstance });
    expect(spec).toEqual({ parentId: "2", position: 0 });
  });

  test("selected instance can accept child", () => {
    const selectedInstance: Instance = {
      component: "Box",
      id: "3",
      cssRules: [],
      children: [],
    };

    const rootInstance: Instance = {
      component: "Box",
      id: "1",
      cssRules: [],
      children: [
        {
          component: "Box",
          id: "2",
          cssRules: [],
          children: [selectedInstance],
        },
      ],
    };

    const spec = createInsertionSpec({ selectedInstance, rootInstance });
    expect(spec).toEqual({ parentId: "3", position: "end" });
  });

  test("selected instance can't accept child, fallback to parent", () => {
    const selectedInstance: Instance = {
      component: "Heading",
      id: "3",
      cssRules: [],
      children: [],
    };

    const rootInstance: Instance = {
      component: "Box",
      id: "1",
      cssRules: [],
      children: [
        {
          component: "Box",
          id: "2",
          cssRules: [],
          children: [selectedInstance],
        },
      ],
    };

    const spec = createInsertionSpec({ selectedInstance, rootInstance });
    expect(spec).toEqual({ parentId: "2", position: "end" });
  });
});
