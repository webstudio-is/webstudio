import { FONT_FORMATS } from "./constants";
import type { FontMeta, FontFormat } from "./schema";

export type PartialFontAsset = {
  format: FontFormat;
  meta: FontMeta;
  path: string;
};

export type FontFace = {
  fontFamily: string;
  fontStyle: FontMeta["style"];
  fontWeight: number;
  fontDisplay: "swap" | "auto" | "block" | "fallback" | "optional";
  src: string;
};

const formatFace = (asset: PartialFontAsset, format: string) => {
  return {
    fontFamily: asset.meta.family,
    fontStyle: asset.meta.style,
    fontWeight: asset.meta.weight,
    fontDisplay: "swap",
    src: `url('${asset.path}') format('${format}')`,
  };
};

const getKey = (asset: PartialFontAsset) =>
  asset.meta.family + asset.meta.style + asset.meta.weight;

export const getFontFaces = (
  assets: Array<PartialFontAsset>
): Array<FontFace> => {
  const faces = new Map();
  for (const asset of assets) {
    const face = faces.get(getKey(asset));
    const format = FONT_FORMATS.get(asset.format);
    if (format === undefined) {
      // Should never happen since we allow only uploading formats we support
      continue;
    }

    if (face === undefined) {
      const face = formatFace(asset, format);
      faces.set(getKey(asset), face);
      continue;
    }

    // We already have that font face, so we need to add the new src
    face.src += `, url('${asset.path}') format('${format}')`;
  }
  return Array.from(faces.values());
};
