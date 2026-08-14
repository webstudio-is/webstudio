import { FONT_FORMATS, type FontStyle } from "./constants";
import type { FontMeta, FontFormat } from "./schema";

export type PartialFontAsset = {
  format: FontFormat;
  meta: FontMeta;
  name: string;
};

export type FontFace = {
  fontFamily: string;
  fontDisplay: "swap" | "auto" | "block" | "fallback" | "optional";
  src: string;
  fontStyle?: FontStyle;
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
  url: string,
  style: FontStyle
): FontFace => {
  if ("variationAxes" in asset.meta) {
    const { wght, wdth } = asset.meta?.variationAxes ?? {};
    return {
      fontFamily: asset.meta.family,
      fontStyle: style,
      fontDisplay: "swap",
      src: `url(${sanitizeCssUrl(url)}) format("${format}")`,
      fontStretch: wdth ? `${wdth.min}% ${wdth.max}%` : undefined,
      fontWeight: wght ? `${wght.min} ${wght.max}` : undefined,
    };
  }
  return {
    fontFamily: asset.meta.family,
    fontStyle: style,
    fontWeight: asset.meta.weight,
    fontDisplay: "swap",
    src: `url(${sanitizeCssUrl(url)}) format("${format}")`,
  };
};

const getKey = (asset: PartialFontAsset, style: FontStyle) => {
  if ("variationAxes" in asset.meta) {
    const { wght, wdth } = asset.meta.variationAxes;
    return JSON.stringify([asset.meta.family, style, wght, wdth]);
  }
  return JSON.stringify([asset.meta.family, style, asset.meta.weight]);
};

const getStyles = (meta: FontMeta): FontStyle[] => {
  const styles = new Set<FontStyle>([meta.style]);
  if ("variationAxes" in meta) {
    const { ital, slnt } = meta.variationAxes;
    if (ital !== undefined && ital.min <= 0 && ital.max >= 1) {
      styles.add("normal");
      styles.add("italic");
    }
    if (
      slnt !== undefined &&
      slnt.min < slnt.max &&
      slnt.min <= 0 &&
      slnt.max >= 0
    ) {
      styles.add("normal");
      styles.add("oblique");
    }
  }
  return Array.from(styles);
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
    Map<
      string,
      {
        asset: PartialFontAsset;
        format: string;
        style: FontStyle;
        url: string;
      }
    >
  >();
  const seenSources = new Set<string>();
  for (const asset of assets) {
    const url = `${assetBaseUrl}${asset.name}`;
    for (const style of getStyles(asset.meta)) {
      const sourceKey = JSON.stringify([url, style]);
      if (seenSources.has(sourceKey)) {
        continue;
      }
      seenSources.add(sourceKey);
      const assetKey = getKey(asset, style);
      const format = getFontFormat(asset);
      const sources = faces.get(assetKey) ?? new Map();
      const existing = sources.get(format);
      if (existing === undefined || url < existing.url) {
        sources.set(format, { asset, format, style, url });
      }
      faces.set(assetKey, sources);
    }
  }
  return Array.from(faces.values(), (sources) => {
    const [{ asset, format, style, url }, ...fallbacks] = Array.from(
      sources.values()
    ).sort(
      (left, right) =>
        fontFormatOrder.indexOf(left.format) -
        fontFormatOrder.indexOf(right.format)
    );
    const face = formatFace(asset, format, url, style);
    face.src += fallbacks
      .map(
        ({ format: fallbackFormat, url: fallbackUrl }) =>
          `, url(${sanitizeCssUrl(fallbackUrl)}) format("${fallbackFormat}")`
      )
      .join("");
    return face;
  });
};
