import type { Asset, FontAsset } from "@webstudio-is/asset-uploader";

export const systemFonts = [
  {
    family: "Arial",
    fallbacks: ["sans-serif"],
  },
  {
    family: "Times New Roman",
    fallbacks: ["serif"],
  },
  {
    family: "Courier New",
    fallbacks: ["monospace"],
  },
  {
    family: "system-ui",
    fallbacks: ["system-ui"],
  },
] as const;

export const defaultFallback = "sans-serif";

const formatMap: Record<string, string> = {
  woff: "woff",
  woff2: "woff2",
  ttf: "truetype",
  otf: "opentype",
};

export const getFontFaces = (assets: Array<Asset>) => {
  const fontAssets = assets.filter(
    (asset) => asset.format in formatMap
  ) as Array<FontAsset>;

  return fontAssets.map((asset) => {
    return {
      fontFamily: asset.meta.family,
      fontStyle: asset.meta.style,
      fontWeight: asset.meta.weight,
      fontDisplay: "swap" as const,
      src: `url('${asset.path}') format('${formatMap[asset.format]}')`,
    };
  });
};
