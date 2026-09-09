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
  readonly line?: number;
  readonly column?: number;

  constructor(
    code: MarkdownMetadataErrorCode,
    message: string,
    location?: { line: number; column: number },
    cause?: unknown
  ) {
    super(message, { cause });
    this.name = "MarkdownMetadataError";
    this.code = code;
    this.line = location?.line;
    this.column = location?.column;
  }
}
