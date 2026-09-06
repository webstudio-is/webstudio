import { useEffect, useState, type ReactNode } from "react";
import { css, cssVar, SplitView, theme } from "@webstudio-is/design-system";
import { renderMarkdownHtml } from "@webstudio-is/sdk-components-react/markdown";
import {
  parseMdxDocument,
  serializeMdxDocument,
  type MdxAuthoredNode,
} from "@webstudio-is/content-engine/mdx";
import { discoverNamedMarkdownAssetReferenceRanges } from "@webstudio-is/content-engine/markdown-assets";
import { rewriteMarkdownAssetReferenceRanges } from "@webstudio-is/content-engine/markdown-references";
import {
  createAssetFolderHierarchy,
  formatAssetName,
  getComponentByJsxName,
  getHtmlTagFromInstance,
  getAssetUrl,
  type Asset,
  type AssetFolders,
  type Instance,
  type Prop,
} from "@webstudio-is/sdk";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import type { AssetContainer } from "~/builder/shared/assets";

const previewStyle = css({
  minWidth: 0,
  height: "100%",
  overflow: "auto",
  boxSizing: "border-box",
  padding: theme.spacing[9],
  color: cssVar("--foreground-primary"),
  background: cssVar("--background-primary"),
  fontFamily: theme.fonts.sans,
  fontSize: 14,
  lineHeight: 1.5,
  userSelect: "text",
  "& > :first-child": { marginTop: 0 },
  "& > :last-child": { marginBottom: 0 },
  "& h1, & h2, & h3, & h4, & h5, & h6": {
    marginBlock: "1em 0.5em",
    fontWeight: 600,
    lineHeight: 1.25,
  },
  "& h1": { fontSize: "2em" },
  "& h2": { fontSize: "1.5em" },
  "& h3": { fontSize: "1.25em" },
  "& p, & ul, & ol, & blockquote, & pre, & table": {
    marginBlock: "1em",
  },
  "& ul, & ol": { paddingLeft: theme.spacing[9] },
  "& ul": { listStyleType: "disc" },
  "& ol": { listStyleType: "decimal" },
  "& blockquote": {
    marginInline: 0,
    paddingLeft: theme.spacing[5],
    color: cssVar("--foreground-secondary"),
    borderLeft: `3px solid ${cssVar("--border-default")}`,
  },
  "& code": {
    padding: "0.125em 0.25em",
    borderRadius: theme.borderRadius[3],
    background: cssVar("--background-secondary"),
    fontFamily: theme.fonts.mono,
  },
  "& pre": {
    overflowX: "auto",
    padding: theme.spacing[5],
    borderRadius: theme.borderRadius[4],
    background: cssVar("--background-secondary"),
  },
  "& pre code": { padding: 0, background: "transparent" },
  "& table": { width: "100%", borderCollapse: "collapse" },
  "& th, & td": {
    padding: theme.spacing[3],
    border: `1px solid ${cssVar("--border-default")}`,
    textAlign: "left",
  },
  "& img": { maxWidth: "100%" },
  "& a": { color: cssVar("--foreground-accent") },
  "& [data-ws-mdx-component-placeholder]": {
    display: "grid",
    placeItems: "center",
    minHeight: theme.spacing[20],
  },
});

// A file can feed multiple Content Blocks, so this preview cannot choose one
// block's custom templates. It can still preserve the semantic HTML tag of a
// registered component fallback such as <Heading tag="h1">.
const getRegisteredComponentPreviewTag = (
  node: Extract<MdxAuthoredNode, { type: "template" }>
) => {
  const component = getComponentByJsxName({
    name: node.name,
    components: componentMetas.keys(),
  });
  const meta =
    component === undefined ? undefined : componentMetas.get(component);
  if (component === undefined || meta === undefined) {
    return;
  }
  const instanceId = "markdown-preview-component";
  const instance: Instance = {
    type: "instance",
    id: instanceId,
    component,
    children: [],
  };
  const selectorNames = new Set(["tag", meta.renderedTag?.prop]);
  const props = new Map<string, Prop>();
  for (const [index, prop] of node.props.entries()) {
    if (
      selectorNames.has(prop.name) === false ||
      typeof prop.value !== "string"
    ) {
      continue;
    }
    props.set(`${instanceId}-${index}`, {
      id: `${instanceId}-${index}`,
      instanceId,
      name: prop.name,
      type: "string",
      value: prop.value,
    });
  }
  return {
    tag: getHtmlTagFromInstance({ instance, metas: componentMetas, props }),
    selectorNames,
  };
};

const materializeRegisteredComponentTags = (
  nodes: readonly MdxAuthoredNode[]
): readonly MdxAuthoredNode[] =>
  nodes.map((node) => {
    if (
      node.type === "text" ||
      node.type === "comment" ||
      node.type === "opaque"
    ) {
      return node;
    }
    const children = materializeRegisteredComponentTags(node.children);
    if (node.type !== "template" || node.syntax !== "jsx") {
      return { ...node, children };
    }
    const preview = getRegisteredComponentPreviewTag(node);
    if (
      children.length === 0 &&
      (preview === undefined || preview.tag === "div")
    ) {
      return {
        type: "element",
        syntax: "mdx",
        tag: "div",
        props: [
          {
            name: "data-ws-mdx-component-placeholder",
            value: "",
          },
        ],
        children: [
          {
            type: "text",
            value: node.name,
            sourceRange: node.sourceRange,
          },
        ],
        mdxMode: "flow",
        sourceRange: node.sourceRange,
      };
    }
    if (preview?.tag === undefined) {
      return { ...node, children };
    }
    return {
      type: "element",
      syntax: "mdx",
      tag: preview.tag,
      props: node.props.filter(
        ({ name }) => preview.selectorNames.has(name) === false
      ),
      children,
      mdxMode: node.mdxMode,
      sourceRange: node.sourceRange,
    };
  });

const renderMarkdownPreview = async ({
  markdown,
  sourceAsset,
  folders,
  assetContainers,
  origin,
}: {
  markdown: string;
  sourceAsset: Asset;
  folders: AssetFolders;
  assetContainers: AssetContainer[];
  origin: string;
}) => {
  const hierarchy = createAssetFolderHierarchy(folders);
  const getNamedAsset = (asset: AssetContainer["asset"]) => ({
    id: asset.id,
    name: formatAssetName(asset),
    folderNames: hierarchy.getPath(asset.folderId).map(({ name }) => name),
  });
  const references = discoverNamedMarkdownAssetReferenceRanges({
    markdown,
    source: getNamedAsset(sourceAsset),
    assets: assetContainers.map(({ asset }) => getNamedAsset(asset)),
  });
  const assetUrls = Object.fromEntries(
    assetContainers.map((container) => [
      container.asset.id,
      container.status === "uploading"
        ? container.objectURL
        : getAssetUrl(container.asset, origin).href,
    ])
  );
  const rewritten = rewriteMarkdownAssetReferenceRanges({
    markdown,
    references,
    assetUrls,
  });
  try {
    const document = await parseMdxDocument({ source: rewritten });
    return renderMarkdownHtml(
      serializeMdxDocument({
        ...document,
        children: materializeRegisteredComponentTags(document.children),
      }),
      { allowBlobImages: true }
    );
  } catch {
    return renderMarkdownHtml(rewritten, { allowBlobImages: true });
  }
};

export const __testing__ = { renderMarkdownPreview };

export const MarkdownSplitView = ({
  open,
  source,
  sourceAsset,
  folders,
  assetContainers,
  children,
}: {
  open: boolean;
  source: string;
  sourceAsset: Asset;
  folders: AssetFolders;
  assetContainers: AssetContainer[];
  children: ReactNode;
}) => {
  const [html, setHtml] = useState("");
  useEffect(() => {
    let active = true;
    if (open === false) {
      setHtml("");
      return;
    }
    void renderMarkdownPreview({
      markdown: source,
      sourceAsset,
      folders,
      assetContainers,
      origin: window.location.origin,
    }).then((nextHtml) => {
      if (active) {
        setHtml(nextHtml);
      }
    });
    return () => {
      active = false;
    };
  }, [assetContainers, folders, open, source, sourceAsset]);

  return (
    <SplitView
      defaultSize={{ value: 50, unit: "%" }}
      start={children}
      end={
        open ? (
          <div
            className={previewStyle()}
            role="region"
            aria-label="Markdown preview"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : undefined
      }
      separatorLabel="Resize Markdown preview"
    />
  );
};
