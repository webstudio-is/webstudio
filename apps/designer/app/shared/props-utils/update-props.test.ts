import { describe, test, expect } from "@jest/globals";
import { Asset } from "@webstudio-is/asset-uploader";
import {
  type AllUserProps,
  type UserPropsUpdates,
} from "@webstudio-is/react-sdk";
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
      updates: [],
    };
    updateAllUserPropsMutable("treeId", propsMap, update);
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
      updates: [{ id: "propId", prop: "a", value: "1", type: "string" }],
    };
    updateAllUserPropsMutable("treeId", propsMap, update);
    expect(propsMap).toMatchSnapshot();
  });

  test("with updated prop value", () => {
    const propsMap: AllUserProps = {
      instanceId: {
        id: "id",
        instanceId: "instanceId",
        treeId: "treeId",
        props: [{ id: "propId", prop: "a", value: "1", type: "string" }],
      },
    };
    const update: UserPropsUpdates = {
      propsId: "id",
      instanceId: "instanceId",
      updates: [{ id: "propId", prop: "a", value: "2", type: "string" }],
    };
    updateAllUserPropsMutable("treeId", propsMap, update);
    expect(propsMap).toMatchSnapshot();
  });

  test("with renamed prop name", () => {
    const propsMap: AllUserProps = {
      instanceId: {
        id: "id",
        instanceId: "instanceId",
        treeId: "treeId",
        props: [{ id: "propId", prop: "a", value: "1", type: "string" }],
      },
    };
    const update: UserPropsUpdates = {
      propsId: "id",
      instanceId: "instanceId",
      updates: [{ id: "propId", prop: "b", value: "1", type: "string" }],
    };
    updateAllUserPropsMutable("treeId", propsMap, update);
    expect(propsMap).toMatchSnapshot();
  });

  test("with changed value to asset type", () => {
    const propsMap: AllUserProps = {
      instanceId: {
        id: "id",
        instanceId: "instanceId",
        treeId: "treeId",
        props: [{ id: "propId", prop: "a", value: "1", type: "string" }],
      },
    };
    const update: UserPropsUpdates = {
      propsId: "id",
      instanceId: "instanceId",
      updates: [
        {
          id: "propId",
          prop: "a",
          type: "asset",
          value: { id: "assetId" } as Asset,
        },
      ],
    };
    updateAllUserPropsMutable("treeId", propsMap, update);
    expect(propsMap).toMatchInlineSnapshot(`
      {
        "instanceId": {
          "id": "id",
          "instanceId": "instanceId",
          "props": [
            {
              "id": "propId",
              "prop": "a",
              "required": undefined,
              "type": "asset",
              "value": {
                "id": "assetId",
              },
            },
          ],
          "treeId": "treeId",
        },
      }
    `);
  });
});
