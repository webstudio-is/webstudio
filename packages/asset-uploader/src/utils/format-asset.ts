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

type FontMetaIssueSummary = { code: string; path: string[] };

const summarizeFontMetaIssues = (
  issues: z.ZodIssue[]
): FontMetaIssueSummary[] =>
  issues.flatMap((issue) =>
    issue.code === "invalid_union"
      ? summarizeFontMetaIssues(issue.errors.flat())
      : [{ code: issue.code, path: issue.path.map(String) }]
  );

const formatAssetWithDiagnostics = (
  input: FormatAssetInput
): { asset: Asset; fontMetaIssues?: FontMetaIssueSummary[] } => {
  const { file } = input;
  const isFont = FONT_FORMATS.has(file.format as FontFormat);
  const base = getBaseAsset(input);
  let parsedMeta: unknown;
  let fontMetaIssues: FontMetaIssueSummary[] | undefined;
  try {
    parsedMeta = JSON.parse(file.meta);
  } catch {
    // Treat invalid persisted metadata as untyped instead of breaking the load.
    if (isFont) {
      fontMetaIssues = [{ code: "invalid_json", path: [] }];
    }
  }

  if (isFont && fontMetaIssues === undefined) {
    const result = fontMeta.safeParse(parsedMeta);
    if (result.success) {
      return {
        asset: {
          ...base,
          type: "font",
          format: file.format as FontFormat,
          meta: result.data,
        },
      };
    }
    fontMetaIssues = summarizeFontMetaIssues(result.error.issues);
  }

  // Detect actual asset type based on file extension
  const detectedType = detectAssetType(file.name);

  if (detectedType === "image") {
    const result = imageMeta.safeParse(parsedMeta);
    if (result.success) {
      return {
        asset: {
          ...base,
          type: "image",
          format: file.format,
          meta: result.data,
        },
      };
    }
  }

  if (detectedType === "video") {
    const result = videoMeta.safeParse(parsedMeta);
    if (result.success) {
      return {
        asset: {
          ...base,
          type: "video",
          format: file.format,
          meta: result.data,
        },
      };
    }
  }

  // Font formats require font metadata, so use an unknown format when falling
  // back to a generic file to keep the asset valid against the SDK schema.
  return {
    asset: {
      ...base,
      type: "file",
      format: isFont ? "unknown" : file.format,
      meta: {},
    },
    ...(fontMetaIssues === undefined ? {} : { fontMetaIssues }),
  };
};

export const formatAsset = (input: FormatAssetInput): Asset =>
  formatAssetWithDiagnostics(input).asset;

export const formatAssetForRead = formatAssetWithDiagnostics;
