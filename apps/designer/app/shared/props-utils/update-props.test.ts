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
      instanceId: [],
    };
    const update: UserPropsUpdates = {
      instanceId: "instanceId",
      updates: [],
    };
    updateAllUserPropsMutable(propsMap, update);
    expect(propsMap).toMatchSnapshot();
  });

  test("with added prop", () => {
    const propsMap: AllUserProps = {
      instanceId: [],
    };
    const update: UserPropsUpdates = {
      instanceId: "instanceId",
      updates: [{ id: "propId", prop: "a", value: "1", type: "string" }],
    };
    updateAllUserPropsMutable(propsMap, update);
    expect(propsMap).toMatchSnapshot();
  });

  test("with updated prop value", () => {
    const propsMap: AllUserProps = {
      instanceId: [{ id: "propId", prop: "a", value: "1", type: "string" }],
    };
    const update: UserPropsUpdates = {
      instanceId: "instanceId",
      updates: [{ id: "propId", prop: "a", value: "2", type: "string" }],
    };
    updateAllUserPropsMutable(propsMap, update);
    expect(propsMap).toMatchSnapshot();
  });

  test("with renamed prop name", () => {
    const propsMap: AllUserProps = {
      instanceId: [{ id: "propId", prop: "a", value: "1", type: "string" }],
    };
    const update: UserPropsUpdates = {
      instanceId: "instanceId",
      updates: [{ id: "propId", prop: "b", value: "1", type: "string" }],
    };
    updateAllUserPropsMutable(propsMap, update);
    expect(propsMap).toMatchSnapshot();
  });

  test("with changed value to asset type", () => {
    const propsMap: AllUserProps = {
      instanceId: [{ id: "propId", prop: "a", value: "1", type: "string" }],
    };
    const update: UserPropsUpdates = {
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
    updateAllUserPropsMutable(propsMap, update);
    expect(propsMap).toMatchInlineSnapshot(`
      {
        "instanceId": [
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
      }
    `);
  });
});
