export type MarkdownMetadataErrorCode =
  | "FRONTMATTER_BYTES_EXCEEDED"
  | "FRONTMATTER_DECODING_FAILED"
  | "FRONTMATTER_INVALID"
  | "FRONTMATTER_DEPTH_EXCEEDED"
  | "FRONTMATTER_FIELDS_EXCEEDED"
  | "FRONTMATTER_STRING_BYTES_EXCEEDED"
  | "MARKDOWN_BODY_BYTES_EXCEEDED"
  | "MARKDOWN_BODY_DECODING_FAILED"
  | "MARKDOWN_EXCERPT_BYTES_EXCEEDED";

export class MarkdownMetadataError extends Error {
  code: MarkdownMetadataErrorCode;

  constructor(code: MarkdownMetadataErrorCode, message: string) {
    super(message);
    this.name = "MarkdownMetadataError";
    this.code = code;
  }
}
