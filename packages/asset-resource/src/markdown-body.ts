import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import {
  ByteLimitExceededError,
  readBoundedBytes,
  type ByteSource,
} from "./byte-stream";
import { MarkdownMetadataError } from "./markdown-errors";
import { findMarkdownFrontmatter } from "./markdown-scanner";

export type MarkdownBody = {
  body: string;
  bodyBytes: number;
  sourceBytes: number;
};

/** Reads and decodes one complete bounded Markdown file, excluding frontmatter. */
export const extractMarkdownBody = async (
  source: ByteSource,
  maximumBytes = assetResourceLimits.hydratedFileBytes
): Promise<MarkdownBody> => {
  if (
    Number.isInteger(maximumBytes) === false ||
    maximumBytes <= 0 ||
    maximumBytes > assetResourceLimits.hydratedFileBytes
  ) {
    throw new MarkdownMetadataError(
      "MARKDOWN_BODY_BYTES_EXCEEDED",
      "Markdown body byte limit is outside the supported range"
    );
  }
  let bytes: Uint8Array;
  try {
    bytes = await readBoundedBytes(source, maximumBytes);
  } catch (error) {
    if (error instanceof ByteLimitExceededError) {
      throw new MarkdownMetadataError(
        "MARKDOWN_BODY_BYTES_EXCEEDED",
        "Markdown content exceeds the byte limit"
      );
    }
    throw error;
  }
  let sourceText: string;
  try {
    sourceText = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new MarkdownMetadataError(
      "MARKDOWN_BODY_DECODING_FAILED",
      "Markdown content is not valid UTF-8"
    );
  }

  const located = findMarkdownFrontmatter(bytes, true);
  const bodyStart = located?.blockEnd ?? 0;
  let body: string;
  try {
    body =
      bodyStart === 0
        ? sourceText
        : new TextDecoder("utf-8", { fatal: true }).decode(
            bytes.subarray(bodyStart)
          );
  } catch {
    throw new MarkdownMetadataError(
      "MARKDOWN_BODY_DECODING_FAILED",
      "Markdown content is not valid UTF-8"
    );
  }
  return {
    body,
    bodyBytes: new TextEncoder().encode(body).byteLength,
    sourceBytes: bytes.byteLength,
  };
};
