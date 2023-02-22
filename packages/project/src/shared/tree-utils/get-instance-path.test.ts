import { describe, test, expect } from "@jest/globals";
import type { Instance } from "@webstudio-is/project-build";
import { getInstancePathWithPositions } from "./get-instance-path";

const getIdAndPosition = (
  array: Array<{ item: { id: string }; position: number }>
) => array.map((item) => [item.item.id, item.position]);

describe("Get instance path with positions", () => {
  test("single possible path", () => {
    const instance: Instance = {
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
    const path = getInstancePathWithPositions(instance, "3");
    expect(getIdAndPosition(path)).toEqual([
      ["1", 0],
      ["2", 0],
      ["3", 0],
    ]);
  });

  test("two possible paths", () => {
    const instance: Instance = {
      type: "instance",
      component: "Box",
      id: "1",
      children: [
        {
          type: "instance",
          component: "Box",
          id: "2a",
          children: [
            {
              type: "instance",
              component: "Box",
              id: "3a",
              children: [],
            },
          ],
        },
        {
          type: "instance",
          component: "Box",
          id: "2b",
          children: [
            {
              type: "instance",
              component: "Box",
              id: "3b",
              children: [],
            },
          ],
        },
      ],
    };
    const path1 = getInstancePathWithPositions(instance, "3b");
    expect(getIdAndPosition(path1)).toEqual([
      ["1", 0],
      ["2b", 1],
      ["3b", 0],
    ]);

    const path2 = getInstancePathWithPositions(instance, "3a");
    expect(getIdAndPosition(path2)).toEqual([
      ["1", 0],
      ["2a", 0],
      ["3a", 0],
    ]);
  });
});
