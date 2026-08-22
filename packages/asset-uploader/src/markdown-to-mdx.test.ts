import { describe, expect, test, vi } from "vitest";
import { contentEngineLimits } from "@webstudio-is/content-engine";
import type { FileAsset } from "@webstudio-is/sdk";
import {
  convertMarkdownAssetToMdx,
  type MarkdownAssetConversionRepository,
} from "./markdown-to-mdx";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const createAsset = (overrides: Partial<FileAsset> = {}): FileAsset => ({
  id: "source",
  projectId: "project",
  type: "file",
  name: "post_source.md",
  filename: "post",
  format: "text/markdown",
  size: 7,
  meta: {},
  description: null,
  folderId: "articles",
  createdAt: "2026-08-14T00:00:00.000Z",
  ...overrides,
});

const readStream = async (stream: ReadableStream<Uint8Array>) => {
  const chunks: Uint8Array[] = [];
  let length = 0;
  for await (const chunk of stream) {
    chunks.push(chunk);
    length += chunk.byteLength;
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return decoder.decode(bytes);
};

const createRepository = ({
  source = "# Hello",
  asset = createAsset(),
}: {
  source?: string | Uint8Array;
  asset?: FileAsset;
} = {}) => {
  let upload = 0;
  const uploadedSources: string[] = [];
  const readContent = vi.fn(async () => ({
    asset,
    data: {
      async *[Symbol.asyncIterator]() {
        yield typeof source === "string" ? encoder.encode(source) : source;
      },
    },
    contentLength:
      typeof source === "string"
        ? encoder.encode(source).byteLength
        : source.byteLength,
  }));
  const createUploadTicket = vi.fn(async () => {
    upload += 1;
    return {
      assetId: `destination-${upload}`,
      name: `post_${upload}.mdx`,
      deduplicated: false as const,
    };
  });
  const completeUpload = vi.fn(
    async ({
      name,
      data,
      assetId,
    }: Parameters<MarkdownAssetConversionRepository["completeUpload"]>[0]) => {
      const uploadedSource = await readStream(data);
      uploadedSources.push(uploadedSource);
      return createAsset({
        id: assetId,
        name,
        filename: "post",
        format: "mdx",
        size: encoder.encode(uploadedSource).byteLength,
      });
    }
  );
  return {
    repository: {
      readContent,
      createUploadTicket,
      completeUpload,
    } satisfies MarkdownAssetConversionRepository,
    readContent,
    createUploadTicket,
    completeUpload,
    uploadedSources,
  };
};

describe("convertMarkdownAssetToMdx", () => {
  test("creates a separate MDX Asset after conversion succeeds", async () => {
    const {
      repository,
      readContent,
      createUploadTicket,
      completeUpload,
      uploadedSources,
    } = createRepository({
      source: "---\ntitle: Post\n---\n# Hello\n",
    });

    const result = await convertMarkdownAssetToMdx({
      repository,
      sourceAssetId: "source",
    });

    expect(readContent).toHaveBeenCalledWith({ assetId: "source" });
    expect(createUploadTicket).toHaveBeenCalledWith({
      type: "text/mdx",
      filename: "post.mdx",
      displayFilename: "post",
      description: undefined,
      folderId: "articles",
    });
    expect(completeUpload).toHaveBeenCalledWith({
      name: "post_1.mdx",
      data: expect.any(ReadableStream),
      assetInfoFallback: undefined,
      assetId: "destination-1",
    });
    expect(result.sourceAsset.id).toBe("source");
    expect(result.asset).toMatchObject({
      id: "destination-1",
      name: "post_1.mdx",
      format: "mdx",
    });
    expect(result.preview.document.frontmatter.properties).toEqual({
      title: "Post",
    });
    expect(uploadedSources).toEqual([result.preview.source]);
  });

  test("allocates a new destination on repeated conversion", async () => {
    const { repository, createUploadTicket } = createRepository();

    const first = await convertMarkdownAssetToMdx({
      repository,
      sourceAssetId: "source",
    });
    const second = await convertMarkdownAssetToMdx({
      repository,
      sourceAssetId: "source",
    });

    expect(first.asset.id).toBe("destination-1");
    expect(second.asset.id).toBe("destination-2");
    expect(createUploadTicket).toHaveBeenCalledTimes(2);
  });

  test("does not reserve a destination when conversion cannot start", async () => {
    const { repository, createUploadTicket, completeUpload } = createRepository(
      {
        asset: createAsset({ name: "post_source.mdx", format: "text/mdx" }),
      }
    );

    await expect(
      convertMarkdownAssetToMdx({
        repository,
        sourceAssetId: "source",
      })
    ).rejects.toThrow("Only Markdown Assets can be converted to MDX");
    expect(createUploadTicket).not.toHaveBeenCalled();
    expect(completeUpload).not.toHaveBeenCalled();
  });

  test("does not reserve a destination when source validation fails", async () => {
    const { repository, createUploadTicket, completeUpload } = createRepository(
      {
        source: "x".repeat(contentEngineLimits.hydratedFileBytes + 1),
      }
    );

    await expect(
      convertMarkdownAssetToMdx({
        repository,
        sourceAssetId: "source",
      })
    ).rejects.toMatchObject({ code: "CONTENT_LIMIT_EXCEEDED" });
    expect(createUploadTicket).not.toHaveBeenCalled();
    expect(completeUpload).not.toHaveBeenCalled();
  });

  test("uses the shared Markdown UTF-8 validation", async () => {
    const { repository, createUploadTicket, completeUpload } = createRepository(
      {
        source: new Uint8Array([0xff]),
      }
    );

    await expect(
      convertMarkdownAssetToMdx({
        repository,
        sourceAssetId: "source",
      })
    ).rejects.toMatchObject({ code: "CONTENT_DECODING_FAILED" });
    expect(createUploadTicket).not.toHaveBeenCalled();
    expect(completeUpload).not.toHaveBeenCalled();
  });

  test("pins completion cleanup to the newly reserved Asset", async () => {
    const { repository, completeUpload } = createRepository();
    completeUpload.mockRejectedValueOnce(new Error("storage unavailable"));

    await expect(
      convertMarkdownAssetToMdx({
        repository,
        sourceAssetId: "source",
      })
    ).rejects.toThrow("storage unavailable");
    expect(completeUpload).toHaveBeenCalledWith({
      name: "post_1.mdx",
      data: expect.any(ReadableStream),
      assetInfoFallback: undefined,
      assetId: "destination-1",
    });
  });
});
