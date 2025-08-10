import { type FontFormat, FontMeta, FONT_FORMATS } from "@webstudio-is/fonts";
import { type Asset, ImageMeta } from "@webstudio-is/sdk";

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
      meta: FontMeta.parse(JSON.parse(file.meta)),
    };
  }

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
    meta: ImageMeta.parse(JSON.parse(file.meta)),
  };
};
