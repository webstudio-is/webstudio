import { describe, test, expect } from "@jest/globals";
import type { Instance } from "@webstudio-is/project-build";
import { reparentInstanceMutable } from "./reparent-instance";

describe("Reparent instance", () => {
  test(`new parent`, () => {
    const rootInstance: Instance = {
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
          children: [
            {
              type: "instance",
              component: "Box",
              id: "4",
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
        {
          type: "instance",
          component: "Box",
          id: "4",
          children: [],
        },
      ],
    };

    reparentInstanceMutable(rootInstance, "2", "1", 2);
    expect(rootInstance).toMatchSnapshot();
  });
});
