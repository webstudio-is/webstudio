import { describe, test, expect } from "@jest/globals";
import { type AllUserProps } from "@webstudio-is/react-sdk";
import { deletePropMutable } from "./delete-prop";

describe("Delete prop", () => {
  test("found and deleted", () => {
    const propsMap: AllUserProps = {
      instanceId: [
        { id: "propId", prop: "b", value: "1", type: "string" },
        { id: "propId1", prop: "a", value: "1", type: "string" },
      ],
    };

    const isDeleted = deletePropMutable(propsMap, {
      instanceId: "instanceId",
      propId: "propId",
    });
    expect(propsMap).toMatchInlineSnapshot(`
      {
        "instanceId": [
          {
            "id": "propId1",
            "prop": "a",
            "type": "string",
            "value": "1",
          },
        ],
      }
    `);
    expect(isDeleted).toBeTruthy();
  });

  test("not found and not deleted", () => {
    const propsMap: AllUserProps = {
      instanceId: [
        { id: "propId", prop: "b", value: "1", type: "string" },
        { id: "propId1", prop: "a", value: "1", type: "string" },
      ],
    };

    const isDeleted = deletePropMutable(propsMap, {
      instanceId: "instanceId",
      propId: "notFound",
    });
    expect(propsMap).toMatchInlineSnapshot(`
      {
        "instanceId": [
          {
            "id": "propId",
            "prop": "b",
            "type": "string",
            "value": "1",
          },
          {
            "id": "propId1",
            "prop": "a",
            "type": "string",
            "value": "1",
          },
        ],
      }
    `);
    expect(isDeleted).toBeFalsy();
  });
});
