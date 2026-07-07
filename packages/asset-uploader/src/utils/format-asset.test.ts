import { describe, test, expect } from "vitest";
import { formatAsset } from "./format-asset";

describe("formatAsset", () => {
  const baseParams = {
    assetId: "test-asset-id",
    projectId: "test-project-id",
    filename: "custom-filename",
    description: "Test description",
  };

  test("formats font asset correctly", () => {
    const result = formatAsset({
      ...baseParams,
      file: {
        name: "Inter-Regular.woff2",
        format: "woff2",
        description: null,
        size: 50000,
        createdAt: "2024-01-01T00:00:00Z",
        meta: JSON.stringify({
          family: "Inter",
          style: "normal",
          weight: 400,
        }),
      },
    });

    expect(result).toMatchObject({
      id: "test-asset-id",
      name: "Inter-Regular.woff2",
      projectId: "test-project-id",
      type: "font",
      format: "woff2",
      size: 50000,
      meta: {
        family: "Inter",
        style: "normal",
        weight: 400,
      },
    });
  });

  test("formats image asset with width and height correctly", () => {
    const result = formatAsset({
      ...baseParams,
      file: {
        name: "photo.jpg",
        format: "jpg",
        description: null,
        size: 100000,
        createdAt: "2024-01-01T00:00:00Z",
        meta: JSON.stringify({
          width: 1920,
          height: 1080,
        }),
      },
    });

    expect(result).toMatchObject({
      id: "test-asset-id",
      name: "photo.jpg",
      projectId: "test-project-id",
      type: "image",
      format: "jpg",
      size: 100000,
      meta: {
        width: 1920,
        height: 1080,
      },
    });
  });

  test("formats video asset with width and height as file type", () => {
    const result = formatAsset({
      ...baseParams,
      file: {
        name: "video.mp4",
        format: "mp4",
        description: null,
        size: 5000000,
        createdAt: "2024-01-01T00:00:00Z",
        meta: JSON.stringify({
          width: 1920,
          height: 1080,
        }),
      },
    });

    expect(result).toMatchObject({
      id: "test-asset-id",
      name: "video.mp4",
      projectId: "test-project-id",
      type: "file",
      format: "mp4",
      size: 5000000,
      meta: {},
    });
  });

  test("formats webm video with width and height as file type", () => {
    const result = formatAsset({
      ...baseParams,
      file: {
        name: "video.webm",
        format: "webm",
        description: null,
        size: 3000000,
        createdAt: "2024-01-01T00:00:00Z",
        meta: JSON.stringify({
          width: 1280,
          height: 720,
        }),
      },
    });

    expect(result).toMatchObject({
      id: "test-asset-id",
      name: "video.webm",
      projectId: "test-project-id",
      type: "file",
      format: "webm",
      size: 3000000,
      meta: {},
    });
  });

  test("formats audio file as file type", () => {
    const result = formatAsset({
      ...baseParams,
      file: {
        name: "audio.mp3",
        format: "mp3",
        description: null,
        size: 2000000,
        createdAt: "2024-01-01T00:00:00Z",
        meta: JSON.stringify({}),
      },
    });

    expect(result).toMatchObject({
      id: "test-asset-id",
      name: "audio.mp3",
      projectId: "test-project-id",
      type: "file",
      format: "mp3",
      size: 2000000,
      meta: {},
    });
  });

  test("formats document file as file type", () => {
    const result = formatAsset({
      ...baseParams,
      file: {
        name: "document.pdf",
        format: "pdf",
        description: null,
        size: 500000,
        createdAt: "2024-01-01T00:00:00Z",
        meta: JSON.stringify({}),
      },
    });

    expect(result).toMatchObject({
      id: "test-asset-id",
      name: "document.pdf",
      projectId: "test-project-id",
      type: "file",
      format: "pdf",
      size: 500000,
      meta: {},
    });
  });

  test("handles null filename and description", () => {
    const result = formatAsset({
      assetId: "test-asset-id",
      projectId: "test-project-id",
      filename: null,
      description: null,
      file: {
        name: "file.pdf",
        format: "pdf",
        description: null,
        size: 100000,
        createdAt: "2024-01-01T00:00:00Z",
        meta: JSON.stringify({}),
      },
    });

    expect(result.filename).toBeUndefined();
    expect(result.description).toBeUndefined();
  });

  test("formats image without dimensions as file type", () => {
    const result = formatAsset({
      ...baseParams,
      file: {
        name: "image.png",
        format: "png",
        description: null,
        size: 50000,
        createdAt: "2024-01-01T00:00:00Z",
        meta: JSON.stringify({}),
      },
    });

    expect(result).toMatchObject({
      type: "file",
      format: "png",
      meta: {},
    });
  });
});
