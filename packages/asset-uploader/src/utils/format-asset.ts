import { type FontFormat, fontMeta, FONT_FORMATS } from "@webstudio-is/fonts";
import {
  type Asset,
  imageMeta,
  videoMeta,
  detectAssetType,
} from "@webstudio-is/sdk";

export const formatAsset = ({
  assetId,
  projectId,
  filename,
  description,
  folderId,
  file,
}: {
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
}): Asset => {
  const isFont = FONT_FORMATS.has(file.format as FontFormat);
  let parsedMeta: unknown;
  try {
    parsedMeta = JSON.parse(file.meta);
  } catch {
    // Treat invalid persisted metadata as an untyped file instead of making
    // the entire project fail to load.
    parsedMeta = undefined;
  }
  const base = {
    id: assetId,
    name: file.name,
    projectId,
    filename: filename ?? undefined,
    description: description ?? undefined,
    folderId: folderId ?? undefined,
    size: file.size,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };

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
