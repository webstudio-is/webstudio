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

  test("instance without style should be an object after creation", () => {
    const createdInstance = createInstance({
      component: "Box",
    });
    expect(typeof createdInstance.style).toBe("object");
  });

  test("instance with children ", () => {
    const createdInstance = createInstance({
      component: "Box",
      children: [
        {
          id: "1",
          component: "Box",
          style: {},
          children: [],
        },
      ],
      style: {},
    });
    expect(createdInstance.children).toEqual([
      {
        id: "1",
        component: "Box",
        style: {},
        children: [],
      },
    ]);
  });
});
