import { FONT_FORMATS } from "./constants";
import type { FontMeta, FontFormat, FontMetaStatic } from "./schema";

export type PartialFontAsset = {
  format: FontFormat;
  meta: FontMeta;
  name: string;
};

export type FontFace = {
  fontFamily: string;
  fontDisplay: "swap" | "auto" | "block" | "fallback" | "optional";
  src: string;
  fontStyle?: FontMetaStatic["style"];
  fontWeight?: number | string;
  fontStretch?: string;
};

// Use JSON.stringify to escape double quotes and backslashes in strings as it automatically replaces " with \" and \ with \\.
const sanitizeCssUrl = (str: string) => JSON.stringify(str);
const fontFormatOrder = Array.from(FONT_FORMATS.values());

const getFontFormat = (asset: PartialFontAsset): string => {
  const extension = asset.name.slice(asset.name.lastIndexOf(".") + 1);
  return FONT_FORMATS.has(extension as FontFormat)
    ? (FONT_FORMATS.get(extension as FontFormat) ?? asset.format)
    : (FONT_FORMATS.get(asset.format) ?? asset.format);
};

const formatFace = (
  asset: PartialFontAsset,
  format: string,
  url: string
): FontFace => {
  if ("variationAxes" in asset.meta) {
    const { wght, wdth } = asset.meta?.variationAxes ?? {};
    return {
      fontFamily: asset.meta.family,
      fontStyle: "normal",
      fontDisplay: "swap",
      src: `url(${sanitizeCssUrl(url)}) format("${format}")`,
      fontStretch: wdth ? `${wdth.min}% ${wdth.max}%` : undefined,
      fontWeight: wght ? `${wght.min} ${wght.max}` : undefined,
    };
  }
  return {
    fontFamily: asset.meta.family,
    fontStyle: asset.meta.style,
    fontWeight: asset.meta.weight,
    fontDisplay: "swap",
    src: `url(${sanitizeCssUrl(url)}) format("${format}")`,
  };
};

const getKey = (asset: PartialFontAsset) => {
  if ("variationAxes" in asset.meta) {
    return asset.meta.family + Object.values(asset.meta.variationAxes).join("");
  }
  return asset.meta.family + asset.meta.style + asset.meta.weight;
};

export const getFontFaces = (
  assets: Array<PartialFontAsset>,
  options: {
    assetBaseUrl: string;
  }
): Array<FontFace> => {
  const { assetBaseUrl } = options;
  const faces = new Map<
    string,
    Map<string, { asset: PartialFontAsset; format: string; url: string }>
  >();
  const seenUrls = new Set<string>();
  for (const asset of assets) {
    const url = `${assetBaseUrl}${asset.name}`;
    const assetKey = getKey(asset);
    if (seenUrls.has(url)) {
      continue;
    }
    seenUrls.add(url);
    const format = getFontFormat(asset);
    const sources = faces.get(assetKey) ?? new Map();
    const existing = sources.get(format);
    if (existing === undefined || url < existing.url) {
      sources.set(format, { asset, format, url });
    }
    faces.set(assetKey, sources);
  }
  return Array.from(faces.values(), (sources) => {
    const [{ asset, format, url }, ...fallbacks] = Array.from(
      sources.values()
    ).sort(
      (left, right) =>
        fontFormatOrder.indexOf(left.format) -
        fontFormatOrder.indexOf(right.format)
    );
    const face = formatFace(asset, format, url);
    face.src += fallbacks
      .map(
        ({ format: fallbackFormat, url: fallbackUrl }) =>
          `, url(${sanitizeCssUrl(fallbackUrl)}) format("${fallbackFormat}")`
      )
      .join("");
    return face;
  });
};
