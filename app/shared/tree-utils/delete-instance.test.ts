import { type Instance } from "@webstudio-is/sdk";
import { deleteInstance } from "./delete-instance";

describe("Delete instance", () => {
  test("div 1 > div 2 > [div 3]", () => {
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

    const updatedInstance = deleteInstance(instance, "3");
    expect(updatedInstance).toMatchSnapshot();
  });

  test("div 1 > div 2, [div 3]", () => {
    const instance: Instance = {
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

    const updatedInstance = deleteInstance(instance, "3");
    expect(updatedInstance).toMatchSnapshot();
  });
});
