import { useMemo, type ReactNode } from "react";
import { css, SplitView, theme } from "@webstudio-is/design-system";
import type { AssetContainer } from "~/builder/shared/assets";
import { getAssetUrl } from "~/builder/shared/assets/asset-utils";
import { renderMarkdown } from "./text-file-utils";

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

const resolveAssetReferences = ({
  html,
  assetContainers,
  origin,
}: {
  html: string;
  assetContainers: AssetContainer[];
  origin: string;
}) => {
  if (typeof DOMParser === "undefined") {
    return html;
  }

  const document = new DOMParser().parseFromString(html, "text/html");
  const urls = new Map(
    assetContainers.map((container) => [
      container.asset.id,
      container.status === "uploading"
        ? container.objectURL
        : getAssetUrl(container.asset, origin).href,
    ])
  );
  for (const image of document.querySelectorAll("img[src]")) {
    const url = urls.get(image.getAttribute("src") ?? "");
    if (url !== undefined) {
      image.setAttribute("src", url);
    }
  }
  for (const link of document.querySelectorAll("a[href]")) {
    const url = urls.get(link.getAttribute("href") ?? "");
    if (url !== undefined) {
      link.setAttribute("href", url);
    }
  }
  return document.body.innerHTML;
};

export const __testing__ = { resolveAssetReferences };

export const MarkdownSplitView = ({
  open,
  source,
  assetContainers,
  children,
}: {
  open: boolean;
  source: string;
  assetContainers: AssetContainer[];
  children: ReactNode;
}) => {
  const html = useMemo(() => {
    if (open === false) {
      return "";
    }
    return resolveAssetReferences({
      html: renderMarkdown(source),
      assetContainers,
      origin: window.location.origin,
    });
  }, [assetContainers, open, source]);

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
