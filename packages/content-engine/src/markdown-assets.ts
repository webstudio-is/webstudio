import { unified } from "unified";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";

export type MarkdownAssetReferences = Readonly<
  Record<string, Readonly<Record<string, string>>>
>;

type MarkdownNode = {
  type?: unknown;
  url?: unknown;
  children?: unknown;
};

const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkStringify);

const transformMarkdownUrls = (
  markdown: string,
  transform: (url: string) => string
) => {
  const tree = markdownProcessor.parse(markdown);
  const visit = (node: MarkdownNode) => {
    if (
      (node.type === "image" ||
        node.type === "link" ||
        node.type === "definition") &&
      typeof node.url === "string"
    ) {
      node.url = transform(node.url);
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        if (typeof child === "object" && child !== null) {
          visit(child);
        }
      }
    }
  };
  visit(tree);
  return { tree, stringify: () => markdownProcessor.stringify(tree) };
};

const getRelativeAssetPath = ({
  sourcePath,
  url,
}: {
  sourcePath: string;
  url: string;
}) => {
  if (url.length === 0 || url.startsWith("#") || url.startsWith("/")) {
    return;
  }
  const origin = "https://content.webstudio.invalid";
  let parsed: URL;
  try {
    const encodedSourcePath = sourcePath
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    parsed = new URL(url, new URL(encodedSourcePath, `${origin}/`));
  } catch {
    return;
  }
  if (parsed.origin !== origin) {
    return;
  }
  const segments: string[] = [];
  for (const encodedSegment of parsed.pathname.slice(1).split("/")) {
    let segment: string;
    try {
      segment = decodeURIComponent(encodedSegment);
    } catch {
      return;
    }
    if (segment === "") {
      continue;
    }
    if (segment.includes("/")) {
      return;
    }
    segments.push(segment);
  }
  return segments.join("/");
};

export const discoverMarkdownAssetReferences = ({
  markdown,
  sourcePath,
  assetIdsByPath,
}: {
  markdown: string;
  sourcePath: string;
  assetIdsByPath: ReadonlyMap<string, string>;
}) => {
  const references: Record<string, string> = {};
  transformMarkdownUrls(markdown, (url) => {
    const path = getRelativeAssetPath({ sourcePath, url });
    const assetId = path === undefined ? undefined : assetIdsByPath.get(path);
    if (assetId !== undefined) {
      references[url] = assetId;
    }
    return url;
  });
  return references;
};

export const rewriteMarkdownAssetReferences = ({
  markdown,
  references,
  assetUrls,
}: {
  markdown: string;
  references: Readonly<Record<string, string>>;
  assetUrls: Readonly<Record<string, string>>;
}) => {
  let changed = false;
  const transformed = transformMarkdownUrls(markdown, (url) => {
    const assetId = references[url];
    const assetUrl = assetId === undefined ? undefined : assetUrls[assetId];
    if (assetUrl === undefined) {
      return url;
    }
    changed = true;
    const parsed = new URL(url, "https://content.webstudio.invalid/");
    return `${assetUrl}${parsed.search}${parsed.hash}`;
  });
  return changed ? transformed.stringify() : markdown;
};
