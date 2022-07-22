/* eslint-disable @typescript-eslint/no-var-requires */
import { Decimal } from "@prisma/client/runtime";

const commonAsset = {
  id: "sa-546",
  width: new Decimal(200),
  height: new Decimal(200),
  projectId: "jdhajk",
  size: 2135,
  format: "png",
  createdAt: new Date(),
  alt: "",
};

describe("getAssetPath", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // Most important - it clears the cache
    process.env = { ...OLD_ENV }; // Make a copy
  });

  afterAll(() => {
    process.env = OLD_ENV; // Restore old environment
  });

  describe("local", () => {
    test("return local path with no custom path", () => {
      const { getAssetPath } = require("./get-asset-path");
      expect(
        getAssetPath({
          ...commonAsset,
          name: "test.png",
          location: "FS",
        })
      ).toBe("/uploads/test.png");
    });

    test("return local path with custom path", () => {
      process.env.FILE_UPLOAD_PATH = "assets";
      const { getAssetPath } = require("./get-asset-path");
      expect(
        getAssetPath({
          ...commonAsset,
          name: "test.png",
          location: "FS",
        })
      ).toBe("/assets/test.png");
    });
  });
});
