import { describe, expect, test } from "vitest";
import { createS3ObjectUrl } from "./object-url";

describe("createS3ObjectUrl", () => {
  test("encodes a flat asset key including separators", () => {
    expect(
      createS3ObjectUrl({
        endpoint: "https://storage.example",
        bucket: "assets",
        key: "folder/project one",
      }).pathname
    ).toBe("/assets/folder%2Fproject%20one");
  });
});
