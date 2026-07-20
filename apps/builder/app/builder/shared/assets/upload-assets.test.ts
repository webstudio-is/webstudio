import { beforeEach, describe, test, expect, vi } from "vitest";
import { __testing__ } from "./upload-assets";

const {
  createUploadTicket,
  deduplicateAssetName,
  getFilesData,
  getUniqueFilesData,
  submitAssetUpload,
} = __testing__;
const request = vi.fn<typeof fetch>();

describe("upload-assets", () => {
  beforeEach(() => {
    request.mockReset();
  });

  test("requests upload tickets without client-supplied asset ids", async () => {
    request.mockResolvedValue(
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
        request,
      })
    ).resolves.toEqual({
      assetId: "server-asset-id",
      name: "upload-name",
    });

    expect(request).toHaveBeenCalledOnce();
    const [_url, init] = request.mock.calls[0] as [
      string,
      { body: FormData; headers: Headers },
    ];
    expect(init.body.has("assetId")).toBe(false);
    expect(init.body.get("projectId")).toBe("project-id");
    expect(init.body.get("type")).toBe("image");
    expect(init.body.get("filename")).toBe("image.png");
    expect(init.body.get("displayFilename")).toBe("image");
    expect(init.headers.get("x-auth-token")).toBe("token");
  });

  test("keeps the display name separate from the sanitized storage name", async () => {
    request.mockResolvedValue(
      new Response(
        JSON.stringify({ assetId: "server-asset-id", name: "upload-name" })
      )
    );

    await createUploadTicket({
      authToken: undefined,
      projectId: "project-id",
      fileOrUrl: new File(["content"], "Campaign photo.png", {
        type: "image/png",
      }),
      assetType: "image",
      request,
    });

    const [, init] = request.mock.calls[0] as [string, { body: FormData }];
    expect(init.body.get("filename")).toBe("Campaign_photo.png");
    expect(init.body.get("displayFilename")).toBe("Campaign photo");
  });

  test("reports non-error upload failures", async () => {
    request.mockRejectedValue("network down");
    const onCompleted = vi.fn();
    const onError = vi.fn();

    await submitAssetUpload({
      authToken: undefined,
      uploadName: "upload-name",
      fileOrUrl: new URL("https://example.com/image.png"),
      onCompleted,
      onError,
      request,
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

  test("releases object URLs discarded during deduplication", async () => {
    const url = new URL("https://example.com/image.png");
    const filesData = await getFilesData("image", [url, url]);
    const revokeObjectURL = vi.fn();

    const uniqueFilesData = getUniqueFilesData(filesData, revokeObjectURL);

    expect(uniqueFilesData.size).toBe(1);
    expect(revokeObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith(url.href);
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

    test("treats a dotfile as a name without an extension", () => {
      expect(deduplicateAssetName(".env", new Set([".env"]))).toBe(".env_1");
    });

    test("preserves extension casing", () => {
      expect(deduplicateAssetName("photo.PNG", new Set(["photo.PNG"]))).toBe(
        "photo_1.PNG"
      );
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
