import {
  defaultTreeAdapter,
  parseFragment,
  serialize,
  type DefaultTreeAdapterMap,
} from "parse5";

const assetAttributes = new Map<string, readonly string[]>([
  ["audio", ["src"]],
  ["embed", ["src"]],
  ["img", ["src"]],
  ["input", ["src"]],
  ["link", ["href"]],
  ["object", ["data"]],
  ["script", ["src"]],
  ["source", ["src"]],
  ["track", ["src"]],
  ["video", ["src", "poster"]],
]);

const resolveAssetUrl = (
  value: string,
  assetUrls: Readonly<Record<string, string>>
) => {
  if (value.startsWith("/") === false || value.startsWith("//")) {
    return;
  }

  const base = "https://webstudio.invalid";
  let reference: URL;
  try {
    reference = new URL(value, base);
  } catch {
    return;
  }

  const assetUrl = assetUrls[reference.pathname];
  if (assetUrl === undefined) {
    return;
  }

  const isAbsolute = URL.canParse(assetUrl);
  const resolved = new URL(assetUrl, base);
  for (const [name, value] of reference.searchParams) {
    resolved.searchParams.append(name, value);
  }
  if (reference.hash !== "") {
    resolved.hash = reference.hash;
  }
  return isAbsolute
    ? resolved.href
    : `${resolved.pathname}${resolved.search}${resolved.hash}`;
};

type HtmlNode = DefaultTreeAdapterMap["childNode"];

export const resolveHtmlEmbedAssetUrls = (
  code: string,
  assetUrls: Readonly<Record<string, string>> | undefined
) => {
  if (assetUrls === undefined) {
    return code;
  }
  let hasAssets = false;
  for (const _path in assetUrls) {
    hasAssets = true;
    break;
  }
  if (hasAssets === false) {
    return code;
  }

  const fragment = parseFragment(code);
  let changed = false;

  const visit = (node: HtmlNode) => {
    if (defaultTreeAdapter.isElementNode(node)) {
      const attributeNames = assetAttributes.get(node.tagName);
      if (attributeNames !== undefined) {
        for (const attribute of node.attrs) {
          if (attributeNames.includes(attribute.name) === false) {
            continue;
          }
          const resolved = resolveAssetUrl(attribute.value, assetUrls);
          if (resolved !== undefined) {
            attribute.value = resolved;
            changed = true;
          }
        }
      }
      if (node.tagName === "template") {
        const template = node as DefaultTreeAdapterMap["template"];
        for (const child of defaultTreeAdapter.getTemplateContent(template)
          .childNodes) {
          visit(child);
        }
      }
    }
    if ("childNodes" in node) {
      for (const child of node.childNodes) {
        visit(child);
      }
    }
  };

  for (const child of fragment.childNodes) {
    visit(child);
  }
  return changed ? serialize(fragment) : code;
};
