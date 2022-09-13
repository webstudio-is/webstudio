import { type Instance } from "@webstudio-is/react-sdk";
import { findClosestSiblingInstance } from "./find-closest-sibling-instance";

describe("Find closest sibling instance", () => {
  test("find", () => {
    const rootInstance: Instance = {
      component: "Box",
      id: "1",
      cssRules: [],
      children: [
        {
          component: "Box",
          id: "3",
          cssRules: [],
          children: [],
        },
        "a",
        {
          component: "Box",
          id: "4",
          cssRules: [],
          children: [],
        },
        "b",
        {
          component: "Box",
          id: "5",
          cssRules: [],
          children: [],
        },
      ],
    };

    expect(
      findClosestSiblingInstance(rootInstance, "notFound")
    ).toBeUndefined();
    expect(findClosestSiblingInstance(rootInstance, "1")).toBeUndefined();
    expect(findClosestSiblingInstance(rootInstance, "3")?.id).toBe("4");
    expect(findClosestSiblingInstance(rootInstance, "4")?.id).toBe("5");
    expect(findClosestSiblingInstance(rootInstance, "5")?.id).toBe("4");
  });
});
