import { micromark } from "micromark";
import { gfmTable, gfmTableHtml } from "micromark-extension-gfm-table";
import { fromMarkdown } from "mdast-util-from-markdown";
import { toString } from "mdast-util-to-string";
import GithubSlugger from "github-slugger";
import type { HtmlExtension } from "micromark-util-types";
import sanitizeHtml from "sanitize-html";
import { forwardRef, useMemo, type ComponentProps } from "react";

type MarkdownEmbedProps = ComponentProps<"div"> & {
  code: string;
  // avoid builder passing it to dom
  children?: never;
};

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
  visit(fromMarkdown(markdown));
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

const sanitizeMarkdownHtml = (html: string) =>
  sanitizeHtml(html, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      "audio",
      "details",
      "iframe",
      "img",
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
      img: ["data", "http", "https"],
      source: ["data", "http", "https"],
      video: ["data", "http", "https"],
    },
    allowProtocolRelative: false,
  });

export const MarkdownEmbed = /* @__PURE__ */ forwardRef<
  HTMLDivElement,
  MarkdownEmbedProps
>((props, ref) => {
  const { code, children, ...rest } = props;
  const html = useMemo(
    // support data uri protocol in images
    () => {
      const markdown = code ?? "";
      return sanitizeMarkdownHtml(
        micromark(markdown, {
          allowDangerousHtml: true,
          allowDangerousProtocol: true,
          extensions: [gfmTable()],
          htmlExtensions: [
            gfmTableHtml(),
            createHeadingIdsHtmlExtension(getHeadingIds(markdown)),
          ],
        })
      );
    },
    [code]
  );
  return <div {...rest} ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
});
