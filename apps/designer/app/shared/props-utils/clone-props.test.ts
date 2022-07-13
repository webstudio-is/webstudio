import { cloneProps } from "./clone-props";

describe("Clone props", () => {
  test("update ids", () => {
    const instanceProps = {
      props: [{ id: "1", prop: "a", value: "1" }],
      id: "id",
      instanceId: "instanceId",
      treeId: "treeId",
    };

    const clonedProps = cloneProps(instanceProps, {
      instanceId: "newInstanceId",
    });
    expect(clonedProps.id).not.toBe(instanceProps.id);
    expect(clonedProps.instanceId).toBe("newInstanceId");
    expect(clonedProps.treeId).toBe(instanceProps.treeId);
    expect(clonedProps.props[0].id).not.toBe(instanceProps.props[0].id);
  });
});
