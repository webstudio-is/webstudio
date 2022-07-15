import { type Instance } from "@webstudio-is/sdk";
import { findClosestAcceptingParent } from "./find-closest-accepting-parent";

describe("Find closest accepting parent", () => {
  test("instance first level can accept child", () => {
    const rootInstance: Instance = {
      component: "Box",
      id: "1",
      cssRules: [],
      children: [],
    };

    const foundInstance = findClosestAcceptingParent(
      rootInstance,
      rootInstance
    );
    expect(foundInstance).toEqual(rootInstance);
  });

  test("instance nested can accept child", () => {
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
    const foundInstance = findClosestAcceptingParent(
      rootInstance,
      targetInstance
    );
    expect(foundInstance).toEqual(targetInstance);
  });

  test("instance can't accept child, fallback to parent", () => {
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

    const foundInstance = findClosestAcceptingParent(
      rootInstance,
      targetInstance
    );
    expect(foundInstance).toEqual(rootInstance.children[0]);
  });
});
