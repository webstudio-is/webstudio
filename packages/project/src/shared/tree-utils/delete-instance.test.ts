import { type Instance } from "@webstudio-is/react-sdk";
import { deleteInstanceMutable } from "./delete-instance";

describe("Delete instance", () => {
  test("div 1 > div 2 > [div 3]", () => {
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

    deleteInstanceMutable(instance, "3");
    expect(instance).toMatchSnapshot();
  });

  test("div 1 > div 2, [div 3]", () => {
    const instance: Instance = {
      component: "Box",
      id: "1",
      cssRules: [],
      children: [
        {
          component: "Box",
          id: "2",
          cssRules: [],
          children: [],
        },
        {
          component: "Box",
          id: "3",
          cssRules: [],
          children: [],
        },
      ],
    };

    deleteInstanceMutable(instance, "3");
    expect(instance).toMatchSnapshot();
  });
});
