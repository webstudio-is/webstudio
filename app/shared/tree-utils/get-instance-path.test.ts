import { type Instance } from "@webstudio-is/sdk";
import { getInstancePath } from "./get-instance-path";

const getIds = (array: Array<{ id: string }>) => array.map((item) => item.id);

describe.only("Get instance path", () => {
  test("single possible path", () => {
    const instance: Instance = {
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
    const path = getInstancePath(instance, "3");
    expect(getIds(path)).toEqual(["1", "2", "3"]);
  });

  test("two possible paths", () => {
    const instance: Instance = {
      component: "Box",
      id: "1",
      style: {},
      children: [
        {
          component: "Box",
          id: "2a",
          style: {},
          children: [
            {
              component: "Box",
              id: "3a",
              style: {},
              children: [],
            },
          ],
        },
        {
          component: "Box",
          id: "2b",
          style: {},
          children: [
            {
              component: "Box",
              id: "3b",
              style: {},
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
