import { HighlightStyle } from "@codemirror/language";
import { highlightCode, tags } from "@lezer/highlight";
import { parser } from "@lezer/css";
import { cssVar } from "@webstudio-is/design-system";

// Syntax categories are a visualization layer. Compose them from the shared
// semantic palette so they adapt to both schemes without adding theme knobs.
export const codeHighlightStyle = HighlightStyle.define([
  {
    tag: tags.comment,
    color: cssVar("--foreground-secondary"),
  },
  {
    tag: tags.string,
    color: cssVar("--foreground-positive"),
  },
  {
    tag: tags.regexp,
    color: cssVar("--foreground-negative"),
  },
  {
    tag: tags.number,
    color: `oklch(from ${cssVar("--foreground-accent")} l c calc(h + 55))`,
  },
  {
    tag: tags.variableName,
    color: cssVar("--foreground-accent"),
  },
  {
    tag: [tags.keyword, tags.operator, tags.punctuation],
    color: cssVar("--foreground-positive"),
  },
  {
    tag: [tags.definitionKeyword, tags.modifier],
    color: cssVar("--foreground-primary"),
  },
  {
    tag: [tags.self, tags.definition(tags.propertyName)],
    color: cssVar("--foreground-accent"),
  },
  {
    tag: tags.function(tags.variableName),
    color: cssVar("--foreground-accent"),
  },
  {
    tag: [tags.bool, tags.null],
    color: cssVar("--foreground-warning"),
  },
  {
    tag: tags.tagName,
    color: cssVar("--foreground-accent"),
  },
  {
    tag: tags.angleBracket,
    color: cssVar("--foreground-secondary"),
  },
  {
    tag: tags.attributeName,
    color: cssVar("--foreground-secondary"),
  },
  {
    tag: tags.typeName,
    color: cssVar("--foreground-positive"),
  },
]);

export const highlightCss = (code: string) => {
  const styles = codeHighlightStyle.module?.getRules();
  // generated classes are scoped to parent
  let highlightedCode = `<style>@scope {${styles}}</style>`;
  highlightCode(
    code,
    parser.parse(code),
    codeHighlightStyle,
    (text, classes) => {
      if (classes) {
        highlightedCode += `<span class="${classes}">${text}</span>`;
      } else {
        highlightedCode += text;
      }
    },
    () => {
      highlightedCode += "\n";
    }
  );
  return highlightedCode;
};
