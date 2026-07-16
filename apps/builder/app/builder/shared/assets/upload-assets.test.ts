import { beforeEach, describe, test, expect, vi } from "vitest";
import { fetch } from "~/shared/fetch.client";
import { __testing__ } from "./upload-assets";

vi.mock("~/shared/fetch.client", () => ({
  fetch: vi.fn(),
}));

const { createUploadTicket, deduplicateAssetName, getFilesData, uploadAsset } =
  __testing__;
const fetchMock = vi.mocked(fetch);

describe("upload-assets", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  test("requests upload tickets without client-supplied asset ids", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ assetId: "server-asset-id", name: "upload-name" })
      )
    );

    await expect(
      createUploadTicket({
        authToken: "token",
        projectId: "project-id",
        fileOrUrl: new File(["content"], "image.png", { type: "image/png" }),
        assetType: "image",
      })
    ).resolves.toEqual({
      assetId: "server-asset-id",
      name: "upload-name",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [_url, init] = fetchMock.mock.calls[0] as [
      string,
      { body: FormData; headers: Headers },
    ];
    expect(init.body.has("assetId")).toBe(false);
    expect(init.body.get("projectId")).toBe("project-id");
    expect(init.body.get("type")).toBe("image");
    expect(init.headers.get("x-auth-token")).toBe("token");
  });

  test("reports non-error upload failures", async () => {
    fetchMock.mockRejectedValue("network down");
    const onCompleted = vi.fn();
    const onError = vi.fn();

    await uploadAsset({
      authToken: undefined,
      uploadName: "upload-name",
      fileOrUrl: new URL("https://example.com/image.png"),
      onCompleted,
      onError,
    });

    expect(onCompleted).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith("network down");
  });

  test("keeps the selected folder throughout upload preparation", async () => {
    const [fileData] = await getFilesData(
      "image",
      [new URL("https://example.com/image.png")],
      "folder-id"
    );

    expect(fileData).toMatchObject({
      source: "url",
      folderId: "folder-id",
      url: "https://example.com/image.png",
    });
  });

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

    test("adds suffix to duplicate names without extension", () => {
      const existingNames = new Set(["no-extension"]);
      const result = deduplicateAssetName("no-extension", existingNames);
      expect(result).toBe("no-extension_1");
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
