import { type FontFormat, fontMeta, FONT_FORMATS } from "@webstudio-is/fonts";
import {
  type Asset,
  imageMeta,
  videoMeta,
  detectAssetType,
} from "@webstudio-is/sdk";
import { z } from "zod";

type FormatAssetInput = {
  assetId: string;
  projectId: string;
  filename: string | null;
  description: string | null;
  folderId?: string | null;
  file: {
    name: string;
    format: string;
    description: string | null;
    size: number;
    createdAt: string;
    updatedAt: string;
    meta: string;
  };
};

const getBaseAsset = ({
  assetId,
  projectId,
  filename,
  description,
  folderId,
  file,
}: FormatAssetInput) => ({
  id: assetId,
  name: file.name,
  projectId,
  filename: filename ?? undefined,
  description: description ?? undefined,
  folderId: folderId ?? undefined,
  size: file.size,
  createdAt: file.createdAt,
  updatedAt: file.updatedAt,
});

const formatInvalidFontAsFile = (input: FormatAssetInput): Asset => ({
  ...getBaseAsset(input),
  type: "file",
  format: "unknown",
  meta: {},
});

export const formatAsset = (input: FormatAssetInput): Asset => {
  const { file } = input;
  const isFont = FONT_FORMATS.has(file.format as FontFormat);
  let parsedMeta: unknown;
  try {
    parsedMeta = JSON.parse(file.meta);
  } catch {
    // Treat invalid persisted metadata as untyped instead of breaking the load.
    parsedMeta = undefined;
  }
  const base = getBaseAsset(input);

  if (isFont) {
    const result = fontMeta.safeParse(parsedMeta);
    if (result.success) {
      return {
        ...base,
        type: "font",
        format: file.format as FontFormat,
        meta: result.data,
      };
    }
  }

  // Detect actual asset type based on file extension
  const detectedType = detectAssetType(file.name);

  if (detectedType === "image") {
    const result = imageMeta.safeParse(parsedMeta);
    if (result.success) {
      return {
        ...base,
        type: "image",
        format: file.format,
        meta: result.data,
      };
    }
  }

  if (detectedType === "video") {
    const result = videoMeta.safeParse(parsedMeta);
    if (result.success) {
      return {
        ...base,
        type: "video",
        format: file.format,
        meta: result.data,
      };
    }
  }

  // Default to file type for everything else
  return {
    ...base,
    type: "file",
    format: file.format,
    meta: {},
  };
};

type FontMetaIssueSummary = { code: string; path: string[] };

const summarizeFontMetaIssues = (
  issues: z.ZodIssue[]
): FontMetaIssueSummary[] =>
  issues.flatMap((issue) =>
    issue.code === "invalid_union"
      ? summarizeFontMetaIssues(issue.errors.flat())
      : [{ code: issue.code, path: issue.path.map(String) }]
  );

export const formatAssetForRead = (
  input: FormatAssetInput
): { asset: Asset; fontMetaIssues?: FontMetaIssueSummary[] } => {
  if (FONT_FORMATS.has(input.file.format as FontFormat)) {
    let parsedMeta: unknown;
    try {
      parsedMeta = JSON.parse(input.file.meta);
    } catch {
      return {
        asset: formatInvalidFontAsFile(input),
        fontMetaIssues: [{ code: "invalid_json", path: [] }],
      };
    }

    const result = fontMeta.safeParse(parsedMeta);
    if (result.success === false) {
      return {
        asset: formatInvalidFontAsFile(input),
        fontMetaIssues: summarizeFontMetaIssues(result.error.issues),
      };
    }
  }

  return { asset: formatAsset(input) };
};
