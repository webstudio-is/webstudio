import { fromMarkdown as parseMarkdown } from "mdast-util-from-markdown";
import { visitParents } from "unist-util-visit-parents";

export const getCode = function getCode(text: string, lang: string) {
  const tree = parseMarkdown(text);
  let code = text;
  const codeBlocks: string[] = [];

  visitParents(tree, "code", (node) => {
    if (node.lang === lang) {
      codeBlocks.unshift(node.value.trim());
    } else if (!node.lang) {
      codeBlocks.push(node.value.trim());
    }
  });

  if (codeBlocks.length > 0) {
    code = codeBlocks[0];
  }

  return code;
};
