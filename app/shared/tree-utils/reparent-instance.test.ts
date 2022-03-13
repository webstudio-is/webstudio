import { type Instance } from "@webstudio-is/sdk";
import { type InstanceReparentingSpec } from ".";
import { reparentInstance } from "./reparent-instance";

describe("Reparent instance", () => {
  test(`div 1 > div 2, div 3  => div 1 > div 2 > div 3`, () => {
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
        {
          component: "Box",
          id: "3",
          style: {},
          children: [],
        },
      ],
    };
    const instanceReparentingSpec: InstanceReparentingSpec = {
      parentId: "2",
      position: "end",
      id: "3",
    };
    const result = reparentInstance(rootInstance, instanceReparentingSpec);
    expect(result).toMatchSnapshot();
  });
});
