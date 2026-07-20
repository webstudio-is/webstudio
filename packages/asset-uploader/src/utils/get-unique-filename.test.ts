import { expect, test } from "vitest";
import { createUniqueAssetFilename } from "./get-unique-filename";

test("adds a storage suffix while preserving filename parts", () => {
  const image = createUniqueAssetFilename("photo.PNG");
  expect(image).toMatch(/^photo_.+\.PNG$/);

  const dotfile = createUniqueAssetFilename(".env");
  expect(dotfile).toMatch(/^\.env_.+$/);
});
