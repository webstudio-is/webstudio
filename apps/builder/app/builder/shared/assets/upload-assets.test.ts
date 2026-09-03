import { beforeEach, describe, test, expect, vi } from "vitest";
import { assetType, type Asset } from "@webstudio-is/sdk";
import type { Project } from "@webstudio-is/project";
import { $assets, $project } from "~/shared/sync/data-stores";
import { __testing__, importAssets } from "./upload-assets";

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
    $project.set(undefined);
    $assets.set(new Map());
  });

  test("requests upload tickets without client-supplied asset ids", async () => {
    request.mockResolvedValue(
      new Response(
        JSON.stringify({
          assetId: "server-asset-id",
          name: "upload-name",
          deduplicated: false,
        })
      )
    );

    await expect(
      createUploadTicket({
        authToken: "token",
        projectId: "project-id",
        folderId: "folder-id",
        fileOrUrl: new File(["content"], "image.png", { type: "image/png" }),
        assetType: "image",
        request,
      })
    ).resolves.toEqual({
      assetId: "server-asset-id",
      name: "upload-name",
      deduplicated: false,
    });

    expect(request).toHaveBeenCalledOnce();
    const [_url, init] = request.mock.calls[0] as [
      string,
      { body: FormData; headers: Headers },
    ];
    expect(init.body.has("assetId")).toBe(false);
    expect(init.body.get("projectId")).toBe("project-id");
    expect(init.body.get("folderId")).toBe("folder-id");
    expect(init.body.get("type")).toBe("image");
    expect(init.body.get("filename")).toBe("image.png");
    expect(init.body.get("displayFilename")).toBe("image");
    expect(init.body.get("contentHash")).toBeNull();
    expect(init.headers.get("x-auth-token")).toBe("token");
  });

  test.each(assetType.options)(
    "reserves %s assets without changing their type",
    async (type) => {
      request.mockResolvedValue(
        Response.json({
          assetId: "server-asset-id",
          name: "upload-name",
          deduplicated: false,
        })
      );

      await createUploadTicket({
        authToken: "token",
        projectId: "project-id",
        fileOrUrl: new File(["content"], `asset.${type}`),
        assetType: type,
        request,
      });

      const [, init] = request.mock.calls[0] as [string, { body: FormData }];
      expect(init.body.get("type")).toBe(type);
    }
  );

  test("keeps the display name separate from the sanitized storage name", async () => {
    request.mockResolvedValue(
      new Response(
        JSON.stringify({
          assetId: "server-asset-id",
          name: "upload-name",
          deduplicated: false,
        })
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

  test("keeps collection filenames independent across folders", async () => {
    $assets.set(
      new Map([
        [
          "other-template",
          {
            id: "other-template",
            projectId: "project-id",
            name: "template-storage.mdx",
            filename: "template",
            folderId: "other-folder",
            type: "file",
            format: "mdx",
            size: 1,
            description: null,
            createdAt: "2026-09-03T00:00:00.000Z",
            meta: {},
          } satisfies Asset,
        ],
      ])
    );
    request.mockResolvedValue(
      Response.json({
        assetId: "new-template",
        name: "upload-name",
        deduplicated: false,
      })
    );

    await createUploadTicket({
      authToken: "token",
      projectId: "project-id",
      folderId: "new-folder",
      fileOrUrl: new File([], "template.mdx", { type: "text/mdx" }),
      assetType: "file",
      request,
    });

    const [, init] = request.mock.calls[0] as [string, { body: FormData }];
    expect(init.body.get("filename")).toBe("template.mdx");
  });

  test("imports every asset type through the production upload queue", async () => {
    $project.set({ id: "target-project" } as Project);
    $assets.set(new Map());
    const sources: Asset[] = [
      {
        id: "font",
        projectId: "source-project",
        name: "brand.woff2",
        type: "font",
        format: "woff2",
        size: 1,
        createdAt: "2026-01-01",
        description: "Brand font",
        meta: { family: "Brand", style: "normal", weight: 400 },
      },
      {
        id: "video",
        projectId: "source-project",
        name: "demo.mp4",
        type: "video",
        format: "mp4",
        size: 1,
        createdAt: "2026-01-01",
        meta: { width: 1920, height: 1080 },
      },
      {
        id: "file",
        projectId: "source-project",
        name: "guide.pdf",
        type: "file",
        format: "pdf",
        size: 1,
        createdAt: "2026-01-01",
        meta: {},
      },
    ];
    const importedById = new Map(
      sources.map((asset) => [
        `imported-${asset.id}`,
        { ...asset, id: `imported-${asset.id}`, projectId: "target-project" },
      ])
    );
    const upload: NonNullable<
      NonNullable<Parameters<typeof importAssets>[2]>["upload"]
    > = vi.fn(async (type, [url]) => {
      return new Map([[url, `imported-${type}`]]);
    });
    const waitForUpload = vi.fn(async (assetId: string) => {
      const asset = importedById.get(assetId);
      if (asset === undefined) {
        throw new Error("Missing imported test asset");
      }
      return asset;
    });

    await expect(
      importAssets(
        "target-project",
        sources.map((asset) => ({
          asset,
          url: `https://source.example.com/${asset.name}`,
        })),
        { upload, waitForUpload }
      )
    ).resolves.toEqual(
      new Map(
        sources.map((asset) => [
          asset.id,
          importedById.get(`imported-${asset.id}`),
        ])
      )
    );

    expect(upload).toHaveBeenNthCalledWith(
      1,
      "font",
      [new URL("https://source.example.com/brand.woff2")],
      {}
    );
    expect(upload).toHaveBeenNthCalledWith(
      2,
      "video",
      [new URL("https://source.example.com/demo.mp4")],
      { dimensions: { width: 1920, height: 1080 } }
    );
    expect(upload).toHaveBeenNthCalledWith(
      3,
      "file",
      [new URL("https://source.example.com/guide.pdf")],
      {}
    );
  });

  test("uploads cross-deployment assets when destination metadata matches", async () => {
    $project.set({ id: "target-project" } as Project);
    const sourceAsset = {
      id: "shared-id",
      projectId: "source-project",
      name: "hero.png",
      type: "image",
      format: "png",
      size: 1,
      createdAt: "2026-01-01",
      description: null,
      meta: { width: 100, height: 100 },
    } satisfies Asset;
    const existingAsset = {
      ...sourceAsset,
      projectId: "target-project",
    } satisfies Asset;
    const importedAsset = {
      ...sourceAsset,
      id: "imported-id",
      projectId: "target-project",
    } satisfies Asset;
    $assets.set(new Map([[existingAsset.id, existingAsset]]));
    const upload = vi.fn(async (_type, [url]: URL[]) => {
      return new Map([[url, importedAsset.id]]);
    });
    const waitForUpload = vi.fn(async () => importedAsset);

    await expect(
      importAssets(
        "target-project",
        [
          {
            asset: sourceAsset,
            url: "https://source.example.com/cgi/image/hero.png?format=raw",
          },
        ],
        { upload, waitForUpload }
      )
    ).resolves.toEqual(new Map([[sourceAsset.id, importedAsset]]));

    expect(upload).toHaveBeenCalledOnce();
    expect(waitForUpload).toHaveBeenCalledWith(importedAsset.id);
  });

  test.each(["md", "mdx", "json"])(
    "imports mutable %s documents without deduplicating them",
    async (format) => {
      $project.set({ id: "target-project" } as Project);
      const sourceAsset = {
        id: "article",
        projectId: "source-project",
        name: `article.${format}`,
        type: "file",
        format,
        size: 1,
        createdAt: "2026-01-01",
        description: null,
        meta: {},
      } satisfies Asset;
      const importedAsset = {
        ...sourceAsset,
        id: "article-copy",
        projectId: "target-project",
      } satisfies Asset;
      const upload = vi.fn(async (_type, [url]: URL[]) => {
        return new Map([[url, importedAsset.id]]);
      });
      const waitForUpload = vi.fn(async () => importedAsset);
      const url = new URL(`https://source.example.com/article.${format}`);

      await importAssets(
        "target-project",
        [{ asset: sourceAsset, url: url.href }],
        { upload, waitForUpload }
      );

      expect(upload).toHaveBeenCalledWith("file", [url], {
        deduplicate: false,
      });
    }
  );

  test("reuses matching assets from the current deployment", async () => {
    $project.set({ id: "target-project" } as Project);
    const existingAsset = {
      id: "existing-id",
      projectId: "target-project",
      name: "hero.png",
      type: "image",
      format: "png",
      size: 1,
      createdAt: "2026-01-01",
      description: null,
      meta: { width: 100, height: 100 },
    } satisfies Asset;
    $assets.set(new Map([[existingAsset.id, existingAsset]]));
    const upload = vi.fn();
    const waitForUpload = vi.fn();

    await expect(
      importAssets(
        "target-project",
        [
          {
            asset: existingAsset,
            url: `${window.location.origin}/cgi/image/hero.png?format=raw`,
          },
        ],
        { upload, waitForUpload }
      )
    ).resolves.toEqual(new Map([[existingAsset.id, existingAsset]]));

    expect(upload).not.toHaveBeenCalled();
    expect(waitForUpload).not.toHaveBeenCalled();
  });

  test("passes the existing browser content hash to the shared upload ticket", async () => {
    request.mockResolvedValue(
      new Response(
        JSON.stringify({
          assetId: "existing-asset-id",
          name: "existing-name",
          deduplicated: true,
        })
      )
    );

    await expect(
      createUploadTicket({
        authToken: "token",
        projectId: "project-id",
        fileOrUrl: new File(["content"], "image.png", {
          type: "image/png",
        }),
        contentHash: "a".repeat(64),
        assetType: "image",
        request,
      })
    ).resolves.toEqual({
      assetId: "existing-asset-id",
      name: "existing-name",
      deduplicated: true,
    });

    const [, init] = request.mock.calls[0] as [string, { body: FormData }];
    expect(init.body.get("contentHash")).toBe("a".repeat(64));
  });

  test("can reserve an independent asset with identical content", async () => {
    request.mockResolvedValue(
      Response.json({
        assetId: "new-asset-id",
        name: "new-name",
        deduplicated: false,
      })
    );

    await createUploadTicket({
      authToken: "token",
      projectId: "project-id",
      fileOrUrl: new File([], "empty.mdx", { type: "text/mdx" }),
      contentHash: "a".repeat(64),
      deduplicate: false,
      assetType: "file",
      request,
    });

    const [, init] = request.mock.calls[0] as [string, { body: FormData }];
    expect(init.body.get("contentHash")).toBeNull();
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

  test("marks URL uploads separately from JSON file uploads", async () => {
    request.mockResolvedValue(
      Response.json({ uploadedAssets: [{ id: "asset" }] })
    );

    await submitAssetUpload({
      authToken: undefined,
      uploadName: "upload-name",
      fileOrUrl: new URL("https://example.com/image.png"),
      onCompleted: vi.fn(),
      onError: vi.fn(),
      request,
    });

    const [, init] = request.mock.calls[0] as [string, { headers: Headers }];
    expect(init.headers.get("x-webstudio-asset-source")).toBe("url");
  });

  test("passes source video dimensions with URL uploads", async () => {
    request.mockResolvedValue(
      Response.json({ uploadedAssets: [{ id: "asset" }] })
    );

    await submitAssetUpload({
      authToken: undefined,
      uploadName: "video.mp4",
      fileOrUrl: new URL("https://example.com/video.mp4"),
      width: 1920,
      height: 1080,
      onCompleted: vi.fn(),
      onError: vi.fn(),
      request,
    });

    expect(request.mock.calls[0]?.[0]).toBe(
      "/rest/assets/uploads/video.mp4?width=1920&height=1080"
    );
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

  test("prepares one content hash for fingerprinting and server deduplication", async () => {
    const [fileData] = await getFilesData(
      "image",
      [new File(["hello"], "image.png", { type: "image/png" })],
      undefined,
      () => "blob:test"
    );

    const contentHash =
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";
    expect(fileData).toMatchObject({
      source: "file",
      contentHash,
      fingerprintId: JSON.stringify(["image.png", contentHash]),
    });
  });

  test("preserves identical file content with different filenames", async () => {
    const filesData = await getFilesData(
      "image",
      [
        new File(["same"], "first.png", { type: "image/png" }),
        new File(["same"], "second.png", { type: "image/png" }),
      ],
      undefined,
      (file) => `blob:${file instanceof File ? file.name : "unknown"}`
    );
    const revokeObjectURL = vi.fn();

    const uniqueFilesData = getUniqueFilesData(filesData, revokeObjectURL);

    expect(uniqueFilesData.size).toBe(2);
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });

  test("deduplicates identical content with the same filename", async () => {
    let objectUrlIndex = 0;
    const filesData = await getFilesData(
      "image",
      [
        new File(["same"], "image.png", { type: "image/png" }),
        new File(["same"], "image.png", { type: "image/png" }),
      ],
      undefined,
      () => `blob:${objectUrlIndex++}`
    );
    const revokeObjectURL = vi.fn();

    const uniqueFilesData = getUniqueFilesData(filesData, revokeObjectURL);

    expect(uniqueFilesData.size).toBe(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:1");
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
