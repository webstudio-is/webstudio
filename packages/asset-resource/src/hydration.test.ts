import { describe, expect, test, vi } from "vitest";
import { assetResourceLimits, type AssetFileDocument } from "@webstudio-is/sdk";
import {
  hydrateAssetResourceResult,
  type AssetResourceContentReader,
} from "./hydration";

const encoder = new TextEncoder();
const createDocument = (
  id: string,
  text: string,
  overrides: Partial<AssetFileDocument> = {}
): AssetFileDocument => ({
  _id: id,
  _type: "asset.file",
  name: `${id}.md`,
  path: `blog/${id}.md`,
  key: id,
  extension: "md",
  mimeType: "text/markdown",
  size: encoder.encode(text).byteLength,
  revision: `revision-${id}`,
  contentRef: `stored-${id}`,
  properties: {},
  ...overrides,
});
const identity = (document: AssetFileDocument) => ({
  _id: document._id,
  revision: document.revision,
  contentRef: document.contentRef,
});
const createReader = (files: Record<string, string | Uint8Array>) =>
  vi.fn<AssetResourceContentReader>(async (contentRef, range) => {
    const source = files[contentRef];
    if (source === undefined) {
      throw new Error("missing fixture");
    }
    const bytes = typeof source === "string" ? encoder.encode(source) : source;
    const selected =
      range === undefined
        ? bytes
        : bytes.subarray(range.offset, range.offset + range.length);
    return {
      data: {
        async *[Symbol.asyncIterator]() {
          yield selected;
        },
      },
      contentLength: selected.byteLength,
    };
  });

describe("selected asset content hydration", () => {
  test("does not inspect identities or read files in none mode", async () => {
    const read = createReader({});
    await expect(
      hydrateAssetResourceResult({
        result: { projected: true },
        documents: [],
        options: { mode: "none" },
        read,
      })
    ).resolves.toEqual({
      content: {},
      hydratedFileCount: 0,
      hydratedBytes: 0,
    });
    expect(read).not.toHaveBeenCalled();
  });

  test("hydrates no files when a detail query has no match", async () => {
    const read = createReader({});
    await expect(
      hydrateAssetResourceResult({
        result: null,
        documents: [],
        options: { mode: "full" },
        read,
      })
    ).resolves.toEqual({
      content: {},
      hydratedFileCount: 0,
      hydratedBytes: 0,
    });
    expect(read).not.toHaveBeenCalled();
  });

  test("hydrates complete text for selected IDs only and deduplicates IDs", async () => {
    const first = createDocument("first", "# First");
    const second = createDocument("second", "# Second");
    const read = createReader({
      [first.contentRef]: "# First",
      [second.contentRef]: "# Second",
    });
    const result = await hydrateAssetResourceResult({
      result: [identity(first), identity(first)],
      documents: [first, second],
      options: { mode: "full" },
      read,
    });

    expect(result.content[first._id]?.text).toBe("# First");
    expect(result.hydratedFileCount).toBe(1);
    expect(read).toHaveBeenCalledOnce();
    expect(read).toHaveBeenCalledWith(first.contentRef, {
      offset: 0,
      length: first.size,
    });
  });

  test("hydrates a bounded byte range with range metadata", async () => {
    const document = createDocument("range", "0123456789");
    const read = createReader({ [document.contentRef]: "0123456789" });
    const result = await hydrateAssetResourceResult({
      result: identity(document),
      documents: [document],
      options: { mode: "range", offset: 3, length: 4 },
      read,
    });

    expect(result.content[document._id]).toMatchObject({
      text: "3456",
      range: { offset: 3, length: 4, total: 10 },
    });
    expect(read).toHaveBeenCalledWith(document.contentRef, {
      offset: 3,
      length: 4,
    });
  });

  test("decodes Markdown body without YAML frontmatter", async () => {
    const source = "---\ntitle: Hello\n---\n# Body\n";
    const document = createDocument("markdown", source);
    const read = createReader({ [document.contentRef]: source });
    const result = await hydrateAssetResourceResult({
      result: identity(document),
      documents: [document],
      options: { mode: "markdown-body" },
      read,
    });
    expect(result.content[document._id]?.text).toBe("# Body\n");
  });

  test("requires selected projections to retain stable content identity", async () => {
    const document = createDocument("post", "Post");
    const read = createReader({ [document.contentRef]: "Post" });
    await expect(
      hydrateAssetResourceResult({
        result: { _id: document._id },
        documents: [document],
        options: { mode: "full" },
        read,
      })
    ).rejects.toMatchObject({ code: "CONTENT_IDENTITY_REQUIRED" });
    await expect(
      hydrateAssetResourceResult({
        result: { ...identity(document), revision: "stale" },
        documents: [document],
        options: { mode: "full" },
        read,
      })
    ).rejects.toMatchObject({ code: "CONTENT_IDENTITY_REQUIRED" });
    expect(read).not.toHaveBeenCalled();
  });

  test("enforces file-count, per-file, and total-byte limits before reads", async () => {
    const read = createReader({});
    const many = Array.from(
      { length: assetResourceLimits.hydratedFileCount + 1 },
      (_, index) => createDocument(`post-${index}`, "x")
    );
    await expect(
      hydrateAssetResourceResult({
        result: many.map(identity),
        documents: many,
        options: { mode: "full" },
        read,
      })
    ).rejects.toMatchObject({ code: "CONTENT_LIMIT_EXCEEDED" });

    const tooLarge = createDocument("large", "", {
      size: assetResourceLimits.hydratedFileBytes + 1,
    });
    await expect(
      hydrateAssetResourceResult({
        result: identity(tooLarge),
        documents: [tooLarge],
        options: { mode: "full" },
        read,
      })
    ).rejects.toMatchObject({ code: "CONTENT_LIMIT_EXCEEDED" });

    const total = Array.from({ length: 3 }, (_, index) =>
      createDocument(`large-${index}`, "", {
        size: assetResourceLimits.hydratedFileBytes,
      })
    );
    await expect(
      hydrateAssetResourceResult({
        result: total.map(identity),
        documents: total,
        options: { mode: "full" },
        read,
      })
    ).rejects.toMatchObject({ code: "CONTENT_LIMIT_EXCEEDED" });
    expect(read).not.toHaveBeenCalled();
  });

  test("rejects binary and invalid UTF-8 while treating frontmatter as data", async () => {
    const binary = createDocument("binary", "png", {
      name: "binary.png",
      extension: "png",
      mimeType: "image/png",
    });
    const invalid = createDocument("invalid", "xx", { size: 2 });
    const protectedDocument = createDocument("private", "secret", {
      properties: { private: true },
    });
    const read = createReader({
      [binary.contentRef]: "png",
      [invalid.contentRef]: new Uint8Array([0xc3, 0x28]),
      [protectedDocument.contentRef]: "secret",
    });
    await expect(
      hydrateAssetResourceResult({
        result: identity(binary),
        documents: [binary],
        options: { mode: "full" },
        read,
      })
    ).rejects.toMatchObject({ code: "CONTENT_NOT_TEXT" });
    await expect(
      hydrateAssetResourceResult({
        result: identity(invalid),
        documents: [invalid],
        options: { mode: "full" },
        read,
      })
    ).rejects.toMatchObject({ code: "CONTENT_DECODING_FAILED" });
    await expect(
      hydrateAssetResourceResult({
        result: identity(protectedDocument),
        documents: [protectedDocument],
        options: { mode: "full" },
        read,
      })
    ).resolves.toMatchObject({
      content: { private: { text: "secret" } },
    });
  });
});
