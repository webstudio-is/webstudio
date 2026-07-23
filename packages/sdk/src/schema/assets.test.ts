import { describe, expect, test } from "vitest";
import { mergeAssetMeta } from "./assets";

describe("mergeAssetMeta", () => {
  test("merges and validates metadata with the asset type schema", () => {
    expect(
      mergeAssetMeta(
        "font",
        { family: "Poppins", style: "normal", weight: 700 },
        { weight: 800 }
      )
    ).toEqual({ family: "Poppins", style: "normal", weight: 800 });
    expect(
      mergeAssetMeta("image", { width: 100, height: 200 }, { width: 300 })
    ).toEqual({ width: 300, height: 200 });
  });

  test("rejects invalid and unsupported metadata", () => {
    expect(
      mergeAssetMeta(
        "font",
        { family: "Poppins", style: "normal", weight: 700 },
        { weight: "heavy" }
      )
    ).toBeUndefined();
    expect(
      mergeAssetMeta(
        "font",
        { family: "Poppins", style: "normal", weight: 700 },
        { familyName: "Poppins" }
      )
    ).toBeUndefined();
    expect(mergeAssetMeta("file", {}, { width: 100 })).toBeUndefined();
  });
});
