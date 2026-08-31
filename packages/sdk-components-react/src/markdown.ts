import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";
import { frontmatter } from "micromark-extension-frontmatter";
import { fromMarkdown } from "mdast-util-from-markdown";
import { frontmatterFromMarkdown } from "mdast-util-frontmatter";
import { toString } from "mdast-util-to-string";
import GithubSlugger from "github-slugger";
import type { HtmlExtension } from "micromark-util-types";
import {
  defaultTreeAdapter,
  html as parse5Html,
  parseFragment,
  serialize,
  type DefaultTreeAdapterMap,
} from "parse5";
import sanitizeHtml from "sanitize-html";
import type { ImageLoader } from "@webstudio-is/image";
import { getSdkImageProps, type SdkImageProps } from "./image-utils";

const getHeadingIds = (markdown: string) => {
  const slugger = new GithubSlugger();
  const ids: string[] = [];
  const visit = (node: unknown) => {
    if (typeof node !== "object" || node === null) {
      return;
    }
    if ("type" in node && node.type === "heading") {
      const text = toString(node as Parameters<typeof toString>[0]);
      ids.push(slugger.slug(text) || slugger.slug("heading"));
    }
    if ("children" in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        visit(child);
      }
    }
  };
  visit(
    fromMarkdown(markdown, {
      extensions: [frontmatter(["yaml"])],
      mdastExtensions: [frontmatterFromMarkdown(["yaml"])],
    })
  );
  return ids;
};

const createHeadingIdsHtmlExtension = (
  headingIds: readonly string[]
): HtmlExtension => {
  let headingIndex = 0;
  const takeHeadingId = () => headingIds[headingIndex++] ?? "heading";
  return {
    exit: {
      atxHeadingSequence(token) {
        if (this.getData("headingRank") !== undefined) {
          return;
        }
        const rank = this.sliceSerialize(token).length;
        this.setData("headingRank", rank);
        this.lineEndingIfNeeded();
        this.tag(`<h${rank} id="${this.encode(takeHeadingId())}">`);
      },
      setextHeading() {
        const value = this.resume();
        const rank = this.getData("headingRank");
        this.lineEndingIfNeeded();
        this.tag(`<h${rank} id="${this.encode(takeHeadingId())}">`);
        this.raw(value);
        this.tag(`</h${rank}>`);
        this.setData("slurpAllLineEndings");
        this.setData("headingRank");
      },
    },
  };
};

const sanitizeMarkdownHtml = (
  html: string,
  {
    allowBlobImages,
    transformTags,
  }: {
    allowBlobImages: boolean;
    transformTags?: sanitizeHtml.IOptions["transformTags"];
  }
) =>
  sanitizeHtml(html, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      "audio",
      "del",
      "details",
      "iframe",
      "img",
      "input",
      "picture",
      "source",
      "summary",
      "video",
    ],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      "*": [
        "aria-*",
        "class",
        "data-*",
        "dir",
        "id",
        "lang",
        "role",
        "tabindex",
        "title",
      ],
      audio: ["autoplay", "controls", "loop", "muted", "preload", "src"],
      iframe: [
        "allow",
        "allowfullscreen",
        "frameborder",
        "height",
        "loading",
        "referrerpolicy",
        "src",
        "width",
      ],
      img: [
        "alt",
        "decoding",
        "height",
        "loading",
        "sizes",
        "src",
        "srcset",
        "width",
      ],
      input: ["checked", "disabled", "type"],
      source: ["media", "sizes", "src", "srcset", "type"],
      video: [
        "autoplay",
        "controls",
        "height",
        "loop",
        "muted",
        "playsinline",
        "poster",
        "preload",
        "src",
        "width",
      ],
    },
    allowedSchemesByTag: {
      audio: ["data", "http", "https"],
      iframe: ["http", "https"],
      img: [...(allowBlobImages ? ["blob"] : []), "data", "http", "https"],
      source: ["data", "http", "https"],
      video: ["data", "http", "https"],
    },
    allowProtocolRelative: false,
    transformTags,
    exclusiveFilter: ({ tag, attribs }) =>
      tag === "input" &&
      (attribs.type !== "checkbox" || attribs.disabled === undefined),
  });

const createImageTransformer =
  ({
    imageLoader,
    renderer,
  }: {
    imageLoader: ImageLoader;
    renderer: "canvas" | "preview" | undefined;
  }): sanitizeHtml.Transformer =>
  (tagName, attributes) => {
    const { srcset, ...rest } = attributes;
    const { imageProps } = getSdkImageProps({
      props: {
        ...rest,
        srcSet: srcset,
        loading: attributes.loading as SdkImageProps["loading"],
        decoding: attributes.decoding as SdkImageProps["decoding"],
      } as SdkImageProps,
      imageLoader,
      renderer,
    });
    const { sizes, srcSet, src, decoding, loading, ...htmlProps } = imageProps;
    const transformedAttributes: sanitizeHtml.Attributes = {};
    for (const [name, value] of Object.entries(htmlProps)) {
      if (typeof value === "string" || typeof value === "number") {
        transformedAttributes[name] = String(value);
      }
    }
    if (sizes !== undefined) {
      transformedAttributes.sizes = String(sizes);
    }
    if (srcSet !== undefined) {
      transformedAttributes.srcset = String(srcSet);
    }
    // Keep src after sizes and srcset so Safari does not load the image twice.
    transformedAttributes.src = String(src);
    transformedAttributes.decoding = String(decoding);
    transformedAttributes.loading = String(loading);

    return { tagName, attribs: transformedAttributes };
  };

const createGfmHtmlExtension = () => {
  const extension = gfmHtml();
  // GFM tag filtering escapes embedded HTML before our stricter sanitizer can
  // inspect it. Remove only those handlers and keep every other GFM renderer;
  // sanitizeMarkdownHtml remains the security boundary for embedded markup.
  delete extension.exit?.htmlFlowData;
  delete extension.exit?.htmlTextData;
  return extension;
};

const markdownAlertTypes = {
  NOTE: "Note",
  TIP: "Tip",
  IMPORTANT: "Important",
  WARNING: "Warning",
  CAUTION: "Caution",
} as const;

type MarkdownAlertType = keyof typeof markdownAlertTypes;

const getAlertMarker = (value: string) => {
  for (const type of Object.keys(markdownAlertTypes) as MarkdownAlertType[]) {
    const marker = `[!${type}]`;
    if (value === marker) {
      return { type, length: marker.length };
    }
    if (value.startsWith(`${marker}\n`)) {
      return { type, length: marker.length + 1 };
    }
    if (value.startsWith(`${marker}\r\n`)) {
      return { type, length: marker.length + 2 };
    }
  }
};

const setAttribute = (
  element: DefaultTreeAdapterMap["element"],
  name: string,
  value: string
) => {
  const attribute = element.attrs.find((item) => item.name === name);
  if (attribute === undefined) {
    element.attrs.push({ name, value });
    return;
  }
  attribute.value = value;
};

const transformMarkdownAlerts = (html: string) => {
  const hasAlertMarker = (
    Object.keys(markdownAlertTypes) as MarkdownAlertType[]
  ).some((type) => html.includes(`[!${type}]`));
  if (hasAlertMarker === false) {
    return html;
  }

  const fragment = parseFragment(html);
  let transformed = false;

  const visit = (node: DefaultTreeAdapterMap["node"]) => {
    if (
      defaultTreeAdapter.isElementNode(node) &&
      node.tagName === "blockquote"
    ) {
      const firstElement = node.childNodes.find((child) =>
        defaultTreeAdapter.isElementNode(child)
      );
      const paragraph =
        firstElement?.tagName === "p" ? firstElement : undefined;
      const markerNode = paragraph?.childNodes[0];
      if (
        paragraph !== undefined &&
        markerNode !== undefined &&
        defaultTreeAdapter.isTextNode(markerNode)
      ) {
        const marker = getAlertMarker(markerNode.value);
        if (marker !== undefined) {
          const title = markdownAlertTypes[marker.type];
          const type = marker.type.toLowerCase();
          const existingClass = node.attrs.find(
            (attribute) => attribute.name === "class"
          )?.value;
          node.tagName = "div";
          node.nodeName = "div";
          setAttribute(
            node,
            "class",
            [existingClass, "markdown-alert", `markdown-alert-${type}`]
              .filter(Boolean)
              .join(" ")
          );
          setAttribute(node, "role", "note");

          const titleParagraph = defaultTreeAdapter.createElement(
            "p",
            parse5Html.NS.HTML,
            [{ name: "class", value: "markdown-alert-title" }]
          );
          defaultTreeAdapter.appendChild(
            titleParagraph,
            defaultTreeAdapter.createTextNode(title)
          );
          defaultTreeAdapter.insertBefore(node, titleParagraph, paragraph);

          markerNode.value = markerNode.value.slice(marker.length);
          if (markerNode.value === "" && paragraph.childNodes.length === 1) {
            defaultTreeAdapter.detachNode(paragraph);
          }
          transformed = true;
        }
      }
    }

    if ("childNodes" in node) {
      for (const child of node.childNodes) {
        visit(child);
      }
    }
  };

  visit(fragment);
  return transformed ? serialize(fragment) : html;
};

/** Shared safe renderer used by both the authoring preview and published component. */
export const renderMarkdownHtml = (
  markdown: string,
  {
    allowBlobImages = false,
    imageLoader,
    renderer,
  }: {
    allowBlobImages?: boolean;
    imageLoader?: ImageLoader;
    renderer?: "canvas" | "preview";
  } = {}
) => {
  const html = sanitizeMarkdownHtml(
    transformMarkdownAlerts(
      micromark(markdown, {
        allowDangerousHtml: true,
        allowDangerousProtocol: true,
        extensions: [frontmatter(["yaml"]), gfm()],
        htmlExtensions: [
          createGfmHtmlExtension(),
          createHeadingIdsHtmlExtension(getHeadingIds(markdown)),
        ],
      })
    ),
    { allowBlobImages }
  );

  if (imageLoader === undefined) {
    return html;
  }

  // Sanitize before transforming so unsafe sources cannot become valid URLs
  // after passing through the image loader. Sanitize the generated attributes
  // again because loaders are application-provided.
  return sanitizeMarkdownHtml(html, {
    allowBlobImages,
    transformTags: {
      img: createImageTransformer({ imageLoader, renderer }),
    },
  });
};
