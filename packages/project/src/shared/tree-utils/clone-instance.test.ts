import { describe, test, expect } from "@jest/globals";
import { type Instance } from "@webstudio-is/react-sdk";
import { cloneInstance } from "./clone-instance";

const getIds = (instance: Instance, ids: Array<Instance["id"]> = []) => {
  ids.push(instance.id);
  for (const child of instance.children) {
    if (typeof child !== "string") {
      getIds(child);
    }
  }
  return ids;
};

describe("Clone instance", () => {
  test("ensure new ids", () => {
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

    const ids = getIds(instance);
    const clone = cloneInstance(instance);
    const clonedIds = getIds(clone);
    ids.forEach((id, index) => {
      expect(id).not.toBe(clonedIds[index]);
    });
  });
});
