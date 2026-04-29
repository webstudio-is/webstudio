import { describe, expect, test } from "vitest";
import { MaxAssetsPerProjectError } from "@webstudio-is/asset-uploader/index.server";

describe("MaxAssetsPerProjectError", () => {
  test("can be classified by type", () => {
    expect(new MaxAssetsPerProjectError(100)).toBeInstanceOf(
      MaxAssetsPerProjectError
    );
  });
});
