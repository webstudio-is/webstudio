import { FONT_FORMATS } from "./constants";
import type { FontMeta } from "./schema";

export const getFontFaces = (
  fontAssets: Array<{ format: string; meta: FontMeta; path: string }>
) => {
  return fontAssets.map((asset) => {
    const format = FONT_FORMATS[asset.format as keyof typeof FONT_FORMATS];
    return {
      fontFamily: asset.meta.family,
      fontStyle: asset.meta.style,
      fontWeight: asset.meta.weight,
      fontDisplay: "swap" as const,
      src: `url('${asset.path}') format('${format}')`,
    };
  });
};
