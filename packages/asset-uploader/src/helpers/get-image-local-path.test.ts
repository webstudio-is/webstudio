/* eslint-disable @typescript-eslint/no-var-requires */
import { getImageLocalDirectory } from "./get-image-local-path";

describe("getAssetPath", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = OLD_ENV;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe("getImageLocalDirectory", () => {
    test("creates path", () => {
      expect(getImageLocalDirectory("uploads")).toBe("public/uploads");
    });
    test("changes path with env", () => {
      process.env.FILE_UPLOAD_PATH = "test";
      const { getImageLocalDirectory } = require("./get-image-local-path");
      expect(getImageLocalDirectory("uploads")).toBe("public/test");
    });
  });
});
