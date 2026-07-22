import { describe, expect, test } from "vitest";
import { createS3ObjectUrl } from "./object-url";

describe("createS3ObjectUrl", () => {
  test("encodes a flat asset key including separators", () => {
    expect(
      createS3ObjectUrl({
        endpoint: "https://storage.example",
        bucket: "assets",
        key: "folder/project one",
        keyType: "flat",
      }).pathname
    ).toBe("/assets/folder%2Fproject%20one");
  });

  test("encodes hierarchical key segments and preserves their separators", () => {
    expect(
      createS3ObjectUrl({
        endpoint: "https://storage.example",
        bucket: "assets",
        key: "folder/project%2Fone/it's.json",
        keyType: "hierarchical",
      }).pathname
    ).toBe("/assets/folder/project%252Fone/it%27s.json");
  });
});
