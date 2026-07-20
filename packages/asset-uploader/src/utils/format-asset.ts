import { type FontFormat, fontMeta, FONT_FORMATS } from "@webstudio-is/fonts";
import { type Asset, imageMeta, detectAssetType } from "@webstudio-is/sdk";

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
  const parsedMeta = JSON.parse(file.meta);
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
    return {
      ...base,
      type: "font",
      format: file.format as FontFormat,
      meta: fontMeta.parse(parsedMeta),
    };
  }

  // Detect actual asset type based on file extension
  const detectedType = detectAssetType(file.name);

  // Check if it's an image by verifying both metadata AND file extension
  // Videos also have width/height but should not be treated as images
  const isImage =
    detectedType === "image" &&
    parsedMeta &&
    typeof parsedMeta.width === "number" &&
    typeof parsedMeta.height === "number";

  if (isImage) {
    return {
      ...base,
      type: "image",
      format: file.format,
      meta: imageMeta.parse(parsedMeta),
    };
  }

  // Default to file type for everything else (including videos)
  return {
    ...base,
    type: "file",
    format: file.format,
    meta: {},
  };
};
