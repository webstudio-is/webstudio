import { describe, test, expect } from "@jest/globals";
import type { Instance } from "@webstudio-is/project-build";
import { deleteInstanceMutable } from "./delete-instance";

describe("Delete instance", () => {
  test("div 1 > div 2 > [div 3]", () => {
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

    deleteInstanceMutable(instance, "3");
    expect(instance).toMatchSnapshot();
  });

  test("div 1 > div 2, [div 3]", () => {
    const instance: Instance = {
      type: "instance",
      component: "Box",
      id: "1",
      children: [
        {
          type: "instance",
          component: "Box",
          id: "2",
          children: [],
        },
        {
          type: "instance",
          component: "Box",
          id: "3",
          children: [],
        },
      ],
    };

    deleteInstanceMutable(instance, "3");
    expect(instance).toMatchSnapshot();
  });
});
