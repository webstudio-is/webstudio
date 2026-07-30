import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";
import { frontmatter } from "micromark-extension-frontmatter";
import { fromMarkdown } from "mdast-util-from-markdown";
import { frontmatterFromMarkdown } from "mdast-util-frontmatter";
import { toString } from "mdast-util-to-string";
import GithubSlugger from "github-slugger";
import type { HtmlExtension } from "micromark-util-types";
import sanitizeHtml from "sanitize-html";

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
  { allowBlobImages }: { allowBlobImages: boolean }
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
      img: ["alt", "height", "loading", "sizes", "src", "srcset", "width"],
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
    exclusiveFilter: ({ tag, attribs }) =>
      tag === "input" &&
      (attribs.type !== "checkbox" || attribs.disabled === undefined),
  });

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
  { allowBlobImages = false }: { allowBlobImages?: boolean } = {}
) =>
  sanitizeMarkdownHtml(
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
