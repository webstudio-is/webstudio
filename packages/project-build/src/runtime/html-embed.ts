import {
  type DefaultTreeAdapterMap,
  defaultTreeAdapter,
  html,
  parseFragment,
  serialize,
  Tokenizer,
  type TokenHandler,
} from "parse5";
import type { WebstudioFragment } from "@webstudio-is/sdk";
import { voidHtmlTags } from "@webstudio-is/html-data";

export type HtmlEmbedCodeError = {
  message: string;
  value: string;
  expected?: string;
};

const htmlEmbedCodeMaxChars = 50_000;
const voidHtmlTagSet = new Set<string>(voidHtmlTags);

const isSelfClosingStartTag = (source: string) => {
  let isSelfClosing = false;
  const ignoreToken = () => {};
  const handler: TokenHandler = {
    onStartTag: (token) => {
      isSelfClosing = token.selfClosing;
    },
    onEndTag: ignoreToken,
    onComment: ignoreToken,
    onDoctype: ignoreToken,
    onCharacter: ignoreToken,
    onNullCharacter: ignoreToken,
    onWhitespaceCharacter: ignoreToken,
    onEof: ignoreToken,
  };
  new Tokenizer({}, handler).write(source, true);
  return isSelfClosing;
};

type SourceRange = { start: number; end: number };
type HtmlNode = DefaultTreeAdapterMap["childNode"];

const getChildNodes = (node: DefaultTreeAdapterMap["element"]) => {
  if (node.tagName === "template") {
    return defaultTreeAdapter.getTemplateContent(
      node as DefaultTreeAdapterMap["template"]
    ).childNodes;
  }
  return node.childNodes;
};

const isParserPreservedHtml = (
  source: string,
  root: DefaultTreeAdapterMap["documentFragment"]
) => {
  const ranges: SourceRange[] = [];

  const inspectChildren = (
    children: HtmlNode[],
    contentStart: number,
    contentEnd: number
  ) => {
    let previousEnd = contentStart;
    for (const child of children) {
      const location = defaultTreeAdapter.getNodeSourceCodeLocation(child);
      if (
        location === undefined ||
        location === null ||
        location.startOffset < previousEnd ||
        location.endOffset > contentEnd
      ) {
        return false;
      }
      previousEnd = location.endOffset;
      if (inspectNode(child) === false) {
        return false;
      }
    }
    return true;
  };

  const inspectNode = (node: HtmlNode): boolean => {
    const location = defaultTreeAdapter.getNodeSourceCodeLocation(node);
    if (location === undefined || location === null) {
      return false;
    }
    if (defaultTreeAdapter.isElementNode(node) === false) {
      ranges.push({ start: location.startOffset, end: location.endOffset });
      return true;
    }
    const { startTag, endTag } = location;
    if (startTag === undefined) {
      return false;
    }
    ranges.push({ start: startTag.startOffset, end: startTag.endOffset });
    if (endTag !== undefined) {
      ranges.push({ start: endTag.startOffset, end: endTag.endOffset });
    } else if (
      (node.namespaceURI !== html.NS.HTML ||
        voidHtmlTagSet.has(node.tagName) === false) &&
      isSelfClosingStartTag(
        source.slice(startTag.startOffset, startTag.endOffset)
      ) === false
    ) {
      return false;
    }
    return inspectChildren(
      getChildNodes(node),
      startTag.endOffset,
      endTag?.startOffset ?? location.endOffset
    );
  };

  if (inspectChildren(root.childNodes, 0, source.length) === false) {
    return false;
  }
  ranges.sort((left, right) => left.start - right.start);
  let consumedEnd = 0;
  for (const range of ranges) {
    if (range.start !== consumedEnd) {
      return false;
    }
    consumedEnd = range.end;
  }
  return consumedEnd === source.length;
};

export const validateHtmlEmbedCode = (
  value: string
): HtmlEmbedCodeError | undefined => {
  if (value.length > htmlEmbedCodeMaxChars) {
    return {
      message: `The HTML Embed code exceeds ${htmlEmbedCodeMaxChars} character limit.`,
      value,
      expected: "",
    };
  }

  const parseErrors: string[] = [];
  const parsed = parseFragment(value, {
    sourceCodeLocationInfo: true,
    onParseError: (error) => {
      parseErrors.push(error.code);
    },
  });
  const expected = serialize(parsed);

  if (parseErrors.length === 0 && isParserPreservedHtml(value, parsed)) {
    return;
  }

  return {
    message: "Entered HTML has a validation error.",
    value,
    expected,
  };
};

export const validateFragmentHtmlEmbedCode = (
  fragment: WebstudioFragment
): HtmlEmbedCodeError | undefined => {
  for (const instance of fragment.instances) {
    if (instance.component !== "HtmlEmbed") {
      continue;
    }
    const code = fragment.props.find(
      (prop) =>
        prop.instanceId === instance.id &&
        prop.name === "code" &&
        prop.type === "string"
    );
    if (code?.type === "string") {
      const error = validateHtmlEmbedCode(code.value);
      if (error !== undefined) {
        return error;
      }
    }
  }
};
