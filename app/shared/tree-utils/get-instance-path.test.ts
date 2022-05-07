import { type Instance } from "@webstudio-is/sdk";
import { getInstancePath } from "./get-instance-path";

const getIds = (array: Array<{ id: string }>) => array.map((item) => item.id);

describe("Get instance path", () => {
  test("single possible path", () => {
    const instance: Instance = {
      component: "Box",
      id: "1",
      cssRules: [],
      children: [
        {
          component: "Box",
          id: "2",
          cssRules: [],
          children: [
            {
              component: "Box",
              id: "3",
              cssRules: [],
              children: [],
            },
          ],
        },
      ],
    };
    const path = getInstancePath(instance, "3");
    expect(getIds(path)).toEqual(["1", "2", "3"]);
  });

  test("two possible paths", () => {
    const instance: Instance = {
      component: "Box",
      id: "1",
      cssRules: [],
      children: [
        {
          component: "Box",
          id: "2a",
          cssRules: [],
          children: [
            {
              component: "Box",
              id: "3a",
              cssRules: [],
              children: [],
            },
          ],
        },
        {
          component: "Box",
          id: "2b",
          cssRules: [],
          children: [
            {
              component: "Box",
              id: "3b",
              cssRules: [],
              children: [],
            },
          ],
        },
      ],
    };
    const path1 = getInstancePath(instance, "3b");
    expect(getIds(path1)).toEqual(["1", "2b", "3b"]);
    const path2 = getInstancePath(instance, "3a");
    expect(getIds(path2)).toEqual(["1", "2a", "3a"]);
  });
});
