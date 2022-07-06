import { type AllUserProps, type UserPropsUpdates } from "@webstudio-is/sdk";
import { updateAllUserPropsMutable } from "./update-props";

describe("Update props", () => {
  test("with empty updates", () => {
    const propsMap: AllUserProps = {
      instanceId: {
        id: "id",
        instanceId: "instanceId",
        treeId: "treeId",
        props: [],
      },
    };
    const update: UserPropsUpdates = {
      propsId: "id",
      instanceId: "instanceId",
      treeId: "treeId",
      updates: [],
    };
    updateAllUserPropsMutable(propsMap, update);
    expect(propsMap).toMatchSnapshot();
  });

  test("with added prop", () => {
    const propsMap: AllUserProps = {
      instanceId: {
        id: "id",
        instanceId: "instanceId",
        treeId: "treeId",
        props: [],
      },
    };
    const update: UserPropsUpdates = {
      propsId: "id",
      instanceId: "instanceId",
      treeId: "treeId",
      updates: [{ id: "propId", prop: "a", value: "1" }],
    };
    updateAllUserPropsMutable(propsMap, update);
    expect(propsMap).toMatchSnapshot();
  });

  test("with updated prop value", () => {
    const propsMap: AllUserProps = {
      instanceId: {
        id: "id",
        instanceId: "instanceId",
        treeId: "treeId",
        props: [{ id: "propId", prop: "a", value: "1" }],
      },
    };
    const update: UserPropsUpdates = {
      propsId: "id",
      instanceId: "instanceId",
      treeId: "treeId",
      updates: [{ id: "propId", prop: "a", value: "2" }],
    };
    updateAllUserPropsMutable(propsMap, update);
    expect(propsMap).toMatchSnapshot();
  });

  test("with renamed prop name", () => {
    const propsMap: AllUserProps = {
      instanceId: {
        id: "id",
        instanceId: "instanceId",
        treeId: "treeId",
        props: [{ id: "propId", prop: "a", value: "1" }],
      },
    };
    const update: UserPropsUpdates = {
      propsId: "id",
      instanceId: "instanceId",
      treeId: "treeId",
      updates: [{ id: "propId", prop: "b", value: "1" }],
    };
    updateAllUserPropsMutable(propsMap, update);
    expect(propsMap).toMatchSnapshot();
  });
});
