import { describe, test, expect } from "@jest/globals";
import { type Instance } from "@webstudio-is/react-sdk";
import { reparentInstanceMutable } from "./reparent-instance";

describe("Reparent instance", () => {
  test(`new parent`, () => {
    const rootInstance: Instance = {
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
          children: [
            {
              component: "Box",
              id: "4",
              cssRules: [],
              children: [],
            },
          ],
        },
      ],
    };

    reparentInstanceMutable(rootInstance, "4", "2", 0);
    expect(rootInstance).toMatchSnapshot();
  });

  test(`same parent different position`, () => {
    const rootInstance: Instance = {
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
        {
          component: "Box",
          id: "4",
          cssRules: [],
          children: [],
        },
      ],
    };

    reparentInstanceMutable(rootInstance, "2", "1", 2);
    expect(rootInstance).toMatchSnapshot();
  });
});
