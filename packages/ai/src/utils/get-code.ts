import { fromMarkdown as parseMarkdown } from "mdast-util-from-markdown";
import { visit } from "unist-util-visit";

export const getCode = function getCode(response: string, lang: string) {
  const tree = parseMarkdown(response);
  let code = response;
  const codeBlocks: string[] = [];

  visit(tree, "code", (node) => {
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
