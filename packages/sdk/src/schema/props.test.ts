import { expect, test } from "vitest";
import { prop } from "./props";

test("normalizes legacy json props without a value", () => {
  expect(
    prop.parse({
      id: "prop-id",
      instanceId: "instance-id",
      name: "data",
      type: "json",
    })
  ).toEqual({
    id: "prop-id",
    instanceId: "instance-id",
    name: "data",
    type: "json",
    value: null,
  });
});
