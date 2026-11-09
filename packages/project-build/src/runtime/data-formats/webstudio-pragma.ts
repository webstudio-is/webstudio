import * as cssTree from "css-tree";
import { parseFragment } from "parse5";

type CommentSyntax = "html" | "css";

type PragmaResult =
  | { owned: false; valid: false }
  | { owned: true; valid: false }
  | {
      owned: true;
      valid: true;
      version: string;
      value?: string;
      start: number;
      end: number;
    };

type Comment = { content: string; start: number; end: number; closed: boolean };

const getComments = (source: string, syntax: CommentSyntax): Comment[] => {
  const comments: Comment[] = [];
  if (syntax === "css") {
    cssTree.parse(source, {
      positions: true,
      onComment: (content, location) => {
        if (location === null) {
          return;
        }
        comments.push({
          content,
          start: location.start.offset,
          end: location.end.offset,
          closed:
            source.slice(location.end.offset - 2, location.end.offset) === "*/",
        });
      },
    });
    return comments;
  }
  const fragment = parseFragment(source, { sourceCodeLocationInfo: true });
  const visit = (
    node: typeof fragment | (typeof fragment.childNodes)[number]
  ) => {
    if ("data" in node && node.sourceCodeLocation) {
      comments.push({
        content: node.data,
        start: node.sourceCodeLocation.startOffset,
        end: node.sourceCodeLocation.endOffset,
        closed:
          source.slice(
            node.sourceCodeLocation.endOffset - 3,
            node.sourceCodeLocation.endOffset
          ) === "-->",
      });
    }
    if ("childNodes" in node) {
      for (const child of node.childNodes) {
        visit(child);
      }
    }
    if ("content" in node) {
      visit(node.content);
    }
  };
  visit(fragment);
  return comments;
};

export const parseWebstudioPragma = ({
  source,
  syntax,
  namespace,
}: {
  source: string;
  syntax: CommentSyntax;
  namespace: string;
}): PragmaResult => {
  const prefix = `@webstudio/${namespace}/`;
  for (const comment of getComments(source, syntax)) {
    const content = comment.content.trim();
    if (content.startsWith(prefix) === false) {
      continue;
    }
    if (!comment.closed) {
      return { owned: true, valid: false };
    }
    const parsed =
      /^@webstudio\/[a-z-]+\/(v?\d+(?:\.\d+)?)(?:\s+("(?:\\.|[^"\\])*"))?$/.exec(
        content
      );
    if (parsed === null) {
      return { owned: true, valid: false };
    }
    try {
      return {
        owned: true,
        valid: true,
        version: parsed[1],
        value: parsed[2] === undefined ? undefined : JSON.parse(parsed[2]),
        start: comment.start,
        end: comment.end,
      };
    } catch {
      return { owned: true, valid: false };
    }
  }
  return { owned: false, valid: false };
};
