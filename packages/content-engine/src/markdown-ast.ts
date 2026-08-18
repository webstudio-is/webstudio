import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdx, { type Options as RemarkMdxOptions } from "remark-mdx";
import remarkParse from "remark-parse";
import { unified } from "unified";

export type SyntaxTreeNode = {
  type: string;
  children?: unknown;
  position?: unknown;
  data?: unknown;
  [key: string]: unknown;
};

export const isSyntaxTreeNode = (value: unknown): value is SyntaxTreeNode =>
  typeof value === "object" &&
  value !== null &&
  "type" in value &&
  typeof value.type === "string";

export const getSyntaxTreeChildren = (node: SyntaxTreeNode) => {
  if (Array.isArray(node.children) === false) {
    return [];
  }
  return node.children.filter(isSyntaxTreeNode);
};

const createMarkdownAstParser = () =>
  unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]).use(remarkGfm);

const markdownAstParser = createMarkdownAstParser();
// Match standalone Webstudio JSX. remark-mdx 2 exposes obsolete types but
// uses Acorn 8 at runtime.
const mdxOptions = {
  acornOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
} as unknown as RemarkMdxOptions;
const mdxAstParser = createMarkdownAstParser().use(remarkMdx, mdxOptions);

/**
 * Parses CommonMark, GFM, and frontmatter consistently. MDX syntax additionally
 * interprets HTML-shaped input as JSX.
 */
export const parseMarkdownAst = (
  source: string,
  syntax: "markdown" | "mdx" = "markdown"
): SyntaxTreeNode =>
  (syntax === "mdx" ? mdxAstParser : markdownAstParser).parse(
    source
  ) as SyntaxTreeNode;
