import { useMemo, type ReactNode } from "react";
import { css, SplitView, theme } from "@webstudio-is/design-system";
import { renderMarkdownHtml } from "@webstudio-is/sdk-components-react/markdown";
import { discoverNamedMarkdownAssetReferenceRanges } from "@webstudio-is/content-engine/markdown-assets";
import { rewriteMarkdownAssetReferenceRanges } from "@webstudio-is/content-engine/markdown-references";
import {
  createAssetFolderHierarchy,
  formatAssetName,
  getAssetUrl,
  type Asset,
  type AssetFolders,
} from "@webstudio-is/sdk";
import type { AssetContainer } from "~/builder/shared/assets";

const previewStyle = css({
  minWidth: 0,
  height: "100%",
  overflow: "auto",
  boxSizing: "border-box",
  padding: theme.spacing[9],
  color: theme.colors.foregroundMain,
  background: theme.colors.backgroundPanel,
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
    color: theme.colors.foregroundSubtle,
    borderLeft: `3px solid ${theme.colors.borderMain}`,
  },
  "& code": {
    padding: "0.125em 0.25em",
    borderRadius: theme.borderRadius[3],
    background: theme.colors.backgroundControls,
    fontFamily: theme.fonts.mono,
  },
  "& pre": {
    overflowX: "auto",
    padding: theme.spacing[5],
    borderRadius: theme.borderRadius[4],
    background: theme.colors.backgroundControls,
  },
  "& pre code": { padding: 0, background: "transparent" },
  "& table": { width: "100%", borderCollapse: "collapse" },
  "& th, & td": {
    padding: theme.spacing[3],
    border: `1px solid ${theme.colors.borderMain}`,
    textAlign: "left",
  },
  "& img": { maxWidth: "100%" },
  "& a": { color: theme.colors.foregroundPrimary },
});

const renderMarkdownPreview = ({
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
  return renderMarkdownHtml(
    rewriteMarkdownAssetReferenceRanges({ markdown, references, assetUrls }),
    { allowBlobImages: true }
  );
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
  const html = useMemo(() => {
    if (open === false) {
      return "";
    }
    return renderMarkdownPreview({
      markdown: source,
      sourceAsset,
      folders,
      assetContainers,
      origin: window.location.origin,
    });
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
