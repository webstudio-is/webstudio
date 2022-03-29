import { type Instance } from "@webstudio-is/sdk";
import { findParentInstance } from "./find-parent-instance";

describe("Find parent instance", () => {
  test("find", () => {
    const rootInstance: Instance = {
      component: "Box",
      id: "1",
      style: {},
      children: [
        {
          component: "Box",
          id: "2",
          style: {},
          children: [
            {
              component: "Box",
              id: "3",
              style: {},
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
