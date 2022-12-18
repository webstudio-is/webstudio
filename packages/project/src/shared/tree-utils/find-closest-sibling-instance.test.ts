import { describe, test, expect } from "@jest/globals";
import { type Instance } from "@webstudio-is/react-sdk";
import { findClosestSiblingInstance } from "./find-closest-sibling-instance";

describe("Find closest sibling instance", () => {
  test("find", () => {
    const rootInstance: Instance = {
      type: "instance",
      component: "Box",
      id: "1",
      cssRules: [],
      children: [
        {
          type: "instance",
          component: "Box",
          id: "3",
          cssRules: [],
          children: [],
        },
        { type: "text", value: "a" },
        {
          type: "instance",
          component: "Box",
          id: "4",
          cssRules: [],
          children: [],
        },
        { type: "text", value: "b" },
        {
          type: "instance",
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
