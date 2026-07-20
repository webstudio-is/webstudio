import { expect, test } from "vitest";
import { createUniqueAssetFilename } from "./get-unique-filename";

test("returns storage and display names from the same filename parts", () => {
  const image = createUniqueAssetFilename("photo.PNG");
  expect(image.basename).toBe("photo");
  expect(image.name).toMatch(/^photo_.+\.PNG$/);

  const dotfile = createUniqueAssetFilename(".env");
  expect(dotfile.basename).toBe(".env");
  expect(dotfile.name).toMatch(/^\.env_.+$/);
});
