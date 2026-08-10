import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";
import { frontmatter } from "micromark-extension-frontmatter";
import { fromMarkdown } from "mdast-util-from-markdown";
import { frontmatterFromMarkdown } from "mdast-util-frontmatter";
import { toString } from "mdast-util-to-string";
import GithubSlugger from "github-slugger";
import type { HtmlExtension } from "micromark-util-types";
import sanitizeHtml from "sanitize-html";
import {
  getImageAttributes,
  imagePlaceholderDataUrl,
  type ImageLoader,
} from "@webstudio-is/image";

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
    let loading = attributes.loading ?? "lazy";
    let decoding = attributes.decoding ?? "async";

    if (renderer === "canvas") {
      loading = "eager";
      decoding = "sync";
    }

    const imageAttributes = getImageAttributes({
      src: String(attributes.src ?? ""),
      srcSet: attributes.srcset,
      sizes: attributes.sizes,
      width: attributes.width,
      quality: undefined,
      loader: imageLoader,
      optimize: true,
    }) ?? { src: imagePlaceholderDataUrl };

    const {
      src: _src,
      srcset: sourceSrcSet,
      sizes: sourceSizes,
      decoding: _decoding,
      loading: _loading,
      ...rest
    } = attributes;
    const transformedAttributes: sanitizeHtml.Attributes = {
      alt: "",
      ...rest,
    };
    const sizes = imageAttributes.sizes ?? sourceSizes;
    const srcSet = imageAttributes.srcSet ?? sourceSrcSet;
    if (sizes !== undefined) {
      transformedAttributes.sizes = sizes;
    }
    if (srcSet !== undefined) {
      transformedAttributes.srcset = srcSet;
    }
    // Keep src after sizes and srcset so Safari does not load the image twice.
    transformedAttributes.src = imageAttributes.src;
    transformedAttributes.decoding = decoding;
    transformedAttributes.loading = loading;

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
    micromark(markdown, {
      allowDangerousHtml: true,
      allowDangerousProtocol: true,
      extensions: [frontmatter(["yaml"]), gfm()],
      htmlExtensions: [
        createGfmHtmlExtension(),
        createHeadingIdsHtmlExtension(getHeadingIds(markdown)),
      ],
    }),
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
