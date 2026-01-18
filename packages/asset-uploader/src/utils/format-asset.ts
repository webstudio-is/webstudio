import { type FontFormat, FontMeta, FONT_FORMATS } from "@webstudio-is/fonts";
import { type Asset, ImageMeta, detectAssetType } from "@webstudio-is/sdk";

export const formatAsset = ({
  assetId,
  projectId,
  filename,
  description,
  file,
}: {
  assetId: string;
  projectId: string;
  filename: string | null;
  description: string | null;
  file: {
    name: string;
    format: string;
    description: string | null;
    size: number;
    createdAt: string;
    meta: string;
  };
}): Asset => {
  const isFont = FONT_FORMATS.has(file.format as FontFormat);
  const parsedMeta = JSON.parse(file.meta);

  if (isFont) {
    return {
      id: assetId,
      name: file.name,
      projectId,
      filename: filename ?? undefined,
      description: description ?? undefined,
      size: file.size,
      type: "font",
      createdAt: file.createdAt,
      format: file.format as FontFormat,
      meta: FontMeta.parse(parsedMeta),
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
      id: assetId,
      name: file.name,
      projectId,
      filename: filename ?? undefined,
      description: description ?? undefined,
      size: file.size,
      type: "image",
      format: file.format,
      createdAt: file.createdAt,
      meta: ImageMeta.parse(parsedMeta),
    };
  }

  // Default to file type for everything else (including videos)
  return {
    id: assetId,
    name: file.name,
    projectId,
    filename: filename ?? undefined,
    description: description ?? undefined,
    size: file.size,
    type: "file",
    format: file.format,
    createdAt: file.createdAt,
    meta: {},
  };
};
