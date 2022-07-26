/* eslint-disable @typescript-eslint/no-var-requires */
import { Decimal } from "@prisma/client/runtime";
import { Location } from "@webstudio-is/prisma-client";
import { getImageLocalDirectory } from "./get-image-local-path";

const commonAsset = {
  id: "sa-546",
  width: new Decimal(200),
  height: new Decimal(200),
  projectId: "id",
  size: 2135,
  format: "png",
  createdAt: new Date(),
  alt: "",
};

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
