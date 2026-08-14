export const documentFormats = ["json", "markdown", "mdx"] as const;
export type DocumentFormat = (typeof documentFormats)[number];

export const isDocumentFormat = (value: unknown): value is DocumentFormat =>
  typeof value === "string" &&
  documentFormats.includes(value as DocumentFormat);

export const isMarkdownSyntaxDocumentFormat = (
  format: DocumentFormat | undefined
): format is "markdown" | "mdx" => format === "markdown" || format === "mdx";

export const getDocumentFormatByContentType = (
  contentType: string
): DocumentFormat | undefined => {
  const mimeType = contentType.split(";", 1)[0].trim().toLowerCase();
  if (mimeType === "application/json") {
    return "json";
  }
  if (mimeType === "text/markdown") {
    return "markdown";
  }
  if (mimeType === "text/mdx") {
    return "mdx";
  }
};
