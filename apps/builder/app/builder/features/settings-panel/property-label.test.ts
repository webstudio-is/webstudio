import { describe, expect, test } from "vitest";
import type { Prop } from "@webstudio-is/sdk";
import { __testing__ } from "./property-label";

const { getPropIdsToDelete } = __testing__;

const prop = (name: string): Prop => ({
  id: `${name}-id`,
  instanceId: "image-id",
  name,
  type: "string",
  value: "",
});

describe("getPropIdsToDelete", () => {
  const imageProps = new Map<Prop["name"], Prop>([
    ["src", prop("src")],
    ["width", prop("width")],
    ["height", prop("height")],
  ]);

  test("deletes related image dimensions with src", () => {
    expect(
      getPropIdsToDelete({
        instanceComponent: "Image",
        instanceProps: imageProps,
        propName: "src",
      })
    ).toEqual(new Set(["src-id", "width-id", "height-id"]));
  });

  test("deletes only the requested prop for non-image components", () => {
    expect(
      getPropIdsToDelete({
        instanceComponent: "Box",
        instanceProps: imageProps,
        propName: "src",
      })
    ).toEqual(new Set(["src-id"]));
  });
});
