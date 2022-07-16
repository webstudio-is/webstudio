import { moveInstanceMutable } from "./move-instance";
import { createInstance } from "./create-instance";

describe("Insert instance", () => {
  test(`No changes`, () => {
    const tree = createInstance({
      id: "root",
      component: "Box",
      children: [
        createInstance({ id: "1", component: "Box" }),
        createInstance({ id: "2", component: "Box" }),
      ],
    });

    moveInstanceMutable(tree, { id: "1", newParentId: "root", newIndex: 0 });

    expect(tree).toMatchSnapshot();
  });

  test(`Change index`, () => {
    const tree = createInstance({
      id: "root",
      component: "Box",
      children: [
        createInstance({ id: "1", component: "Box" }),
        createInstance({ id: "2", component: "Box" }),
      ],
    });

    moveInstanceMutable(tree, { id: "1", newParentId: "root", newIndex: 1 });

    expect(tree).toMatchSnapshot();
  });

  test(`Change index nested`, () => {
    const tree = createInstance({
      id: "root",
      component: "Box",
      children: [
        createInstance({
          id: "1",
          component: "Box",
          children: [
            createInstance({ id: "3", component: "Box" }),
            createInstance({ id: "4", component: "Box" }),
          ],
        }),
        createInstance({ id: "2", component: "Box" }),
      ],
    });

    moveInstanceMutable(tree, { id: "3", newParentId: "1", newIndex: 1 });

    expect(tree).toMatchSnapshot();
  });

  test(`Change parent`, () => {
    const tree = createInstance({
      id: "root",
      component: "Box",
      children: [
        createInstance({
          id: "1",
          component: "Box",
          children: [
            createInstance({ id: "3", component: "Box" }),
            createInstance({ id: "4", component: "Box" }),
          ],
        }),
        createInstance({ id: "2", component: "Box" }),
      ],
    });

    moveInstanceMutable(tree, { id: "3", newParentId: "2", newIndex: 0 });

    expect(tree).toMatchSnapshot();
  });
});
