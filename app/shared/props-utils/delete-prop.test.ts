import { type AllUserProps } from "@webstudio-is/sdk";
import { deletePropMutable } from "./delete-prop";

describe("Delete prop", () => {
  test("found and deleted", () => {
    const propsMap: AllUserProps = {
      instanceId: {
        id: "id",
        instanceId: "instanceId",
        treeId: "treeId",
        props: [
          { id: "propId", prop: "b", value: "1" },
          { id: "propId1", prop: "a", value: "1" },
        ],
      },
    };

    const isDeleted = deletePropMutable(propsMap, {
      instanceId: "instanceId",
      propId: "propId",
    });
    expect(propsMap).toMatchSnapshot();
    expect(isDeleted).toBeTruthy();
  });

  test("not found and not deleted", () => {
    const propsMap: AllUserProps = {
      instanceId: {
        id: "id",
        instanceId: "instanceId",
        treeId: "treeId",
        props: [
          { id: "propId", prop: "b", value: "1" },
          { id: "propId1", prop: "a", value: "1" },
        ],
      },
    };

    const isDeleted = deletePropMutable(propsMap, {
      instanceId: "instanceId",
      propId: "notFound",
    });
    expect(propsMap).toMatchSnapshot();
    expect(isDeleted).toBeFalsy();
  });
});
