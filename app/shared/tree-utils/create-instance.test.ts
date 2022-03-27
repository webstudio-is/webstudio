import { createInstance } from "./create-instance";

describe("create instance", () => {
  test("instance without id should be auto generated", () => {
    const createdInstance = createInstance({
      component: "Box",
      id: undefined,
      children: [],
      style: {},
    });

    // We cannot do snapshot testing here as the id will always be unique
    expect(createdInstance.id).toBeDefined();
  });

  test("instance without children should be empty by default", () => {
    const createdInstance = createInstance({
      component: "Box",
      id: undefined,
      children: undefined,
      style: {},
    });
    expect(createdInstance.children.length).toBe(0);
  });

  test("instance with children ", () => {
    const createdInstance = createInstance({
      component: "Box",
      id: undefined,
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
    expect(createdInstance.children.length).toBe(1);
  });
});
