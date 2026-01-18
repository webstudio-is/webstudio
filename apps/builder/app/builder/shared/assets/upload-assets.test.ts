import { describe, test, expect } from "vitest";
import { __testing__ } from "./upload-assets";

const { deduplicateAssetName } = __testing__;

describe("upload-assets", () => {
  describe("deduplicateAssetName", () => {
    test("returns original name when no duplicates exist", () => {
      const existingNames = new Set(["other-file.png", "another-file.jpg"]);
      const result = deduplicateAssetName("unique-file.png", existingNames);
      expect(result).toBe("unique-file.png");
    });

    test("adds suffix when duplicate exists", () => {
      const existingNames = new Set(["duplicate.png"]);
      const result = deduplicateAssetName("duplicate.png", existingNames);
      expect(result).toBe("duplicate_1.png");
    });

    test("increments suffix for multiple duplicates", () => {
      const existingNames = new Set(["file.png", "file_1.png", "file_2.png"]);
      const result = deduplicateAssetName("file.png", existingNames);
      expect(result).toBe("file_3.png");
    });

    test("handles names without extension", () => {
      const existingNames = new Set<string>();
      const result = deduplicateAssetName("no-extension", existingNames);
      expect(result).toBe("no-extension");
    });

    test("handles empty existing names set", () => {
      const existingNames = new Set<string>();
      const result = deduplicateAssetName("file.jpg", existingNames);
      expect(result).toBe("file.jpg");
    });

    test("handles complex file extensions", () => {
      const existingNames = new Set(["archive.tar.gz"]);
      const result = deduplicateAssetName("archive.tar.gz", existingNames);
      expect(result).toBe("archive.tar_1.gz");
    });

    test("finds first available suffix with gaps", () => {
      const existingNames = new Set(["file.png", "file_2.png", "file_3.png"]);
      const result = deduplicateAssetName("file.png", existingNames);
      expect(result).toBe("file_1.png");
    });
  });
});
