import { describe, test, expect } from "@jest/globals";
import { type Instance } from "@webstudio-is/react-sdk";
import { findParentInstance } from "./find-parent-instance";

describe("Find parent instance", () => {
  test("find", () => {
    const rootInstance: Instance = {
      type: "instance",
      component: "Box",
      id: "1",
      children: [
        {
          type: "instance",
          component: "Box",
          id: "2",
          children: [
            {
              type: "instance",
              component: "Box",
              id: "3",
              children: [],
            },
          ],
        },
      ],
    };

    expect(findParentInstance(rootInstance, "3")?.id).toBe("2");
    expect(findParentInstance(rootInstance, "2")?.id).toBe("1");
    expect(findParentInstance(rootInstance, "1")).toBe(undefined);
  });
});
