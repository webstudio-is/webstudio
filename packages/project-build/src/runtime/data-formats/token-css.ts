import {
  extractCssCustomProperties,
  parseCss,
  parseMediaQuery,
  validateSelector,
} from "@webstudio-is/css-data";
import {
  createRegularStyleSheet,
  FakeStyleElement,
  toValue,
  type TransformValue,
} from "@webstudio-is/css-engine";
import {
  FONT_FORMATS,
  getFontFaces,
  type FontFormat,
} from "@webstudio-is/fonts";
import {
  getAssetUrl,
  getTagStyleId,
  isTagStyleTag,
  type Asset,
  type Breakpoint,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import * as cssTree from "css-tree";
import { parseWebstudioPragma } from "./webstudio-pragma";
import {
  mapCssValueUrls,
  mapParsedCssStyles,
  traverseStyleValue,
} from "../style-utils";

const tokenId = "clipboard-token";
const rootId = "clipboard-root";
const baseId = "clipboard-base";

export type TokenTransferData = {
  tokenId: string;
  fragment: WebstudioFragment;
  sourceOrigin?: string;
};

type TransferKind = "token" | "tagStyle" | "local";

const transferFormat = (kind: TransferKind) =>
  kind === "token"
    ? { namespace: "token-css", selector: ".ws-token" }
    : kind === "tagStyle"
      ? { namespace: "tag-style-css", selector: ".ws-tag-style" }
      : { namespace: "local-style-css", selector: ".ws-local" };

export const serializeTokenCss = (
  data: TokenTransferData,
  kind: TransferKind = "token"
): string => {
  const { fragment, sourceOrigin } = data;
  const token = fragment.styleSources.find(
    (source) => source.id === data.tokenId
  );
  if (token?.type !== kind) {
    throw new Error("Invalid token data");
  }
  const sheet = createRegularStyleSheet({ element: new FakeStyleElement() });
  const assets = new Map(fragment.assets.map((asset) => [asset.id, asset]));
  const transformValue: TransformValue = (value) => {
    if (value.type === "unparsed" && sourceOrigin !== undefined) {
      const rebased = mapCssValueUrls(value.value, (url) => {
        try {
          return new URL(url, sourceOrigin).href;
        } catch {
          return;
        }
      });
      if (rebased !== value.value) {
        return { ...value, value: rebased };
      }
    }
    if (value.type !== "image" || value.value.type !== "asset") {
      return;
    }
    const asset = assets.get(value.value.value);
    if (asset === undefined) {
      return;
    }
    const url = getAssetUrl(asset, sourceOrigin ?? "https://webstudio.invalid");
    return {
      type: "image",
      value: {
        type: "url",
        url: sourceOrigin ? url.href : url.pathname + url.search,
      },
      hidden: value.hidden,
    };
  };
  sheet.setTransformer(transformValue);
  for (const breakpoint of fragment.breakpoints) {
    sheet.addMediaRule(breakpoint.id, breakpoint);
  }
  const tokenMixin = sheet.addMixinRule(data.tokenId);
  const rootMixin = sheet.addMixinRule(rootId);
  for (const style of fragment.styles) {
    (style.styleSourceId === data.tokenId
      ? tokenMixin
      : rootMixin
    ).setDeclaration({
      breakpoint: style.breakpointId,
      selector: style.state ?? "",
      property: style.property,
      value: style.value,
    });
  }
  sheet.addNestingRule(":root").applyMixins([rootId]);
  sheet
    .addNestingRule(transferFormat(kind).selector)
    .applyMixins([data.tokenId]);
  const fonts = fragment.assets.filter((asset) => asset.type === "font");
  for (const face of getFontFaces(fonts, {
    assetBaseUrl: sourceOrigin ? `${sourceOrigin}/cgi/asset/` : "/cgi/asset/",
  })) {
    sheet.addFontFaceRule(face);
  }
  const name = JSON.stringify(
    token.type === "token"
      ? token.name
      : token.type === "tagStyle"
        ? token.tag
        : "local"
  ).replaceAll("*/", "*\\/");
  return `/* @webstudio/${transferFormat(kind).namespace}/v1 ${name} */\n${sheet.cssText}`;
};

type ParsedTokenCss =
  | { owned: false; valid: false }
  | { owned: true; valid: false }
  | { owned: true; valid: true; data: TokenTransferData };

const assetFromUrl = (
  urlText: string,
  type: "image" | "font",
  fontMeta?: {
    family: string;
    style: "normal" | "italic" | "oblique";
    weight: number;
  }
): Asset | undefined => {
  let url: URL;
  try {
    url = new URL(urlText, "https://webstudio.invalid");
  } catch {
    return;
  }
  if (
    url.pathname.startsWith("/cgi/image/") === false &&
    url.pathname.startsWith("/cgi/asset/") === false
  ) {
    return;
  }
  let name: string;
  try {
    name = decodeURIComponent(url.pathname.split("/").at(-1) ?? "");
  } catch {
    return;
  }
  if (name === "") {
    return;
  }
  const format = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  const common = {
    id: url.href,
    projectId: "",
    size: 0,
    name,
    description: null,
    createdAt: "",
  };
  if (type === "font") {
    if (
      FONT_FORMATS.has(format as FontFormat) === false ||
      fontMeta === undefined
    ) {
      return;
    }
    return { ...common, type, format: format as FontFormat, meta: fontMeta };
  }
  return { ...common, type, format, meta: { width: 0, height: 0 } };
};

const parseStyleSourceTransferData = (
  source: string,
  kind: TransferKind
): ParsedTokenCss => {
  const format = transferFormat(kind);
  const pragma = parseWebstudioPragma({
    source,
    syntax: "css",
    namespace: format.namespace,
  });
  if (pragma.valid === false) {
    return pragma;
  }
  if (
    pragma.version !== "v1" ||
    typeof pragma.value !== "string" ||
    (kind === "tagStyle" && !isTagStyleTag(pragma.value)) ||
    (kind === "local" && pragma.value !== "local") ||
    source.slice(0, pragma.start).trim() !== ""
  ) {
    return { owned: true, valid: false };
  }
  const body = source.slice(pragma.end);
  let syntaxError = false;
  const ast = cssTree.parse(body, {
    positions: true,
    onParseError: () => {
      syntaxError = true;
    },
  });
  const fonts: Asset[] = [];
  const visit = (
    nodes: cssTree.List<cssTree.CssNode>,
    inMedia = false
  ): boolean =>
    nodes.toArray().every((node) => {
      if (node.type === "Rule") {
        const rootSelector =
          node.prelude.type === "SelectorList" &&
          node.prelude.children
            .toArray()
            .every(
              (item) =>
                item.type === "Selector" &&
                item.children.first?.type === "PseudoClassSelector" &&
                item.children.first.name === "root"
            );
        const tokenSelector =
          node.prelude.type === "SelectorList" &&
          node.prelude.children
            .toArray()
            .every(
              (item) =>
                item.type === "Selector" &&
                item.children.first?.type === "ClassSelector" &&
                item.children.first.name === format.selector.slice(1)
            );
        return node.block !== null && (rootSelector || tokenSelector);
      }
      if (node.type !== "Atrule" || node.block === null || inMedia) {
        return false;
      }
      if (node.name.toLowerCase() === "media") {
        return visit(node.block.children, true);
      }
      if (node.name.toLowerCase() === "font-face") {
        const declarations = new Map<string, cssTree.Declaration>();
        node.block.children.forEach((child) => {
          if (child.type === "Declaration") {
            declarations.set(child.property.toLowerCase(), child);
          }
        });
        const familyText = declarations.get("font-family")?.value;
        const familyPart =
          familyText?.type === "Value" && familyText.children.size === 1
            ? familyText.children.first
            : undefined;
        const family =
          familyPart?.type === "String"
            ? familyPart.value
            : familyText
              ? cssTree.generate(familyText)
              : "";
        const styleText = declarations.get("font-style")?.value;
        const style = styleText ? cssTree.generate(styleText) : "normal";
        const weightText = declarations.get("font-weight")?.value;
        let weight = 400;
        let foundWeight = false;
        if (weightText !== undefined) {
          cssTree.walk(weightText, (part) => {
            if (part.type === "Number" && !foundWeight) {
              weight = Number(part.value);
              foundWeight = true;
            }
          });
        }
        const src = declarations.get("src")?.value;
        if (
          family === "" ||
          (style !== "normal" && style !== "italic" && style !== "oblique") ||
          Number.isFinite(weight) === false ||
          src === undefined
        ) {
          return false;
        }
        let foundUrl = false;
        let validUrls = true;
        cssTree.walk(src, (node) => {
          if (node.type !== "Url") {
            return;
          }
          foundUrl = true;
          const asset = assetFromUrl(node.value, "font", {
            family,
            style,
            weight,
          });
          if (asset === undefined) {
            validUrls = false;
          } else {
            fonts.push(asset);
          }
        });
        return foundUrl && validUrls;
      }
      return false;
    });
  if (ast.type !== "StyleSheet") {
    return { owned: true, valid: false };
  }
  if (syntaxError || !visit(ast.children)) {
    return { owned: true, valid: false };
  }
  const parsed = parseCss(body, extractCssCustomProperties(body, ast), ast, {
    preserveShorthandVariables: true,
    preserveNonPixelWidth: true,
    parseSelector: (selector) => {
      const name =
        selector.children.first?.type === "PseudoClassSelector"
          ? ":root"
          : format.selector;
      return {
        name,
        state: cssTree.generate(selector).slice(name.length) || undefined,
      };
    },
  });
  if (
    parsed.errors.length > 0 ||
    parsed.styles.some(
      (style) =>
        (style.selector === ":root" && !style.property.startsWith("--")) ||
        (kind === "tagStyle" &&
          style.selector !== ":root" &&
          style.state !== undefined &&
          validateSelector(style.state, { allowDescendants: false }).success ===
            false)
    )
  ) {
    return { owned: true, valid: false };
  }
  const breakpoints = new Map<string, Breakpoint>();
  breakpoints.set(baseId, { id: baseId, label: "Base" });
  const assets = new Map<string, Asset>(
    fonts.map((asset) => [asset.id, asset])
  );
  let sourceOrigin: string | undefined;
  let invalidBreakpoint = false;
  const styles = mapParsedCssStyles(parsed.styles, (style) => {
    const breakpointId = style.breakpoint ?? baseId;
    if (!breakpoints.has(breakpointId)) {
      const media =
        parseMediaQuery(breakpointId, { preserveNonPixelWidth: true }) ??
        (breakpointId.startsWith("(") && breakpointId.endsWith(")")
          ? { condition: breakpointId.slice(1, -1) }
          : undefined);
      if (media === undefined) {
        invalidBreakpoint = true;
        return;
      }
      const representedQuery =
        media.condition === undefined
          ? [
              media.minWidth === undefined
                ? undefined
                : `(min-width:${media.minWidth}px)`,
              media.maxWidth === undefined
                ? undefined
                : `(max-width:${media.maxWidth}px)`,
            ]
              .filter(Boolean)
              .join(" and ")
          : `(${media.condition})`;
      breakpoints.set(breakpointId, {
        id: breakpointId,
        label: breakpointId,
        ...(breakpointId !== representedQuery
          ? {
              condition: breakpointId.startsWith("(")
                ? breakpointId.slice(1, -1)
                : breakpointId,
            }
          : media),
      });
    }
    const value = structuredClone(
      style.value.type === "var"
        ? { type: "unparsed" as const, value: toValue(style.value) }
        : style.value
    );
    traverseStyleValue(value, (item) => {
      if (item.type === "image" && item.value.type === "url") {
        const asset = assetFromUrl(item.value.url, "image");
        if (asset !== undefined) {
          assets.set(asset.id, asset);
          item.value = { type: "asset", value: asset.id };
        }
      }
      if (item.type === "unparsed") {
        mapCssValueUrls(item.value, (url) => {
          const asset = assetFromUrl(url, "image");
          if (asset !== undefined) {
            assets.set(asset.id, asset);
          }
          return;
        });
      }
    });
    const isRoot = style.selector === ":root";
    return {
      styleSourceId: isRoot ? rootId : tokenId,
      breakpointId,
      value,
      state: style.state,
    };
  });
  if (invalidBreakpoint) {
    return { owned: true, valid: false };
  }
  for (const asset of assets.values()) {
    const url = new URL(asset.id);
    if (url.hostname !== "webstudio.invalid") {
      if (sourceOrigin !== undefined && sourceOrigin !== url.origin) {
        return { owned: true, valid: false };
      }
      sourceOrigin = url.origin;
    }
  }
  const tagStyleId =
    kind === "tagStyle" ? getTagStyleId(pragma.value) : tokenId;
  const fragment: WebstudioFragment = {
    children: [],
    instances: [],
    props: [],
    dataSources: [],
    resources: [],
    styleSourceSelections: [],
    styleSources: [
      kind === "token"
        ? { type: "token", id: tokenId, name: pragma.value }
        : kind === "tagStyle"
          ? { type: "tagStyle", id: tagStyleId, tag: pragma.value }
          : { type: "local", id: tokenId },
    ],
    styles,
    breakpoints: [...breakpoints.values()],
    assets: [...assets.values()],
  };
  return {
    owned: true,
    valid: true,
    data: {
      tokenId: tagStyleId,
      fragment: {
        ...fragment,
        styles:
          kind === "token"
            ? fragment.styles
            : fragment.styles.map((style) =>
                style.styleSourceId === tokenId
                  ? { ...style, styleSourceId: tagStyleId }
                  : style
              ),
      },
      sourceOrigin,
    },
  };
};

export const parseTokenTransferData = (source: string) =>
  parseStyleSourceTransferData(source, "token");

export const parseTagStyleTransferData = (source: string) =>
  parseStyleSourceTransferData(source, "tagStyle");

export const parseLocalStyleTransferData = (source: string) =>
  parseStyleSourceTransferData(source, "local");

export const parseReusableStyleSourceTransferData = (source: string) => {
  const tagStyle = parseTagStyleTransferData(source);
  return tagStyle.owned ? tagStyle : parseLocalStyleTransferData(source);
};
