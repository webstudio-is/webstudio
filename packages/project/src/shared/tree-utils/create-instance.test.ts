import { describe, test, expect } from "@jest/globals";
import { createInstance } from "./create-instance";

describe("create instance", () => {
  test("instance without id should be auto generated", () => {
    const createdInstance = createInstance({
      component: "Box",
    });

    expect(typeof createdInstance.id).toBe("string");
  });

  test("instance without children should be empty by default", () => {
    const createdInstance = createInstance({
      component: "Box",
    });
    expect(createdInstance.children.length).toBe(0);
  });

  test("instance with children ", () => {
    const createdInstance = createInstance({
      component: "Box",
      children: [
        {
          type: "instance",
          id: "1",
          component: "Box",
          children: [],
        },
      ],
    });
    expect(createdInstance.children).toEqual([
      {
        type: "instance",
        id: "1",
        component: "Box",
        children: [],
      },
    ]);
  });
});
