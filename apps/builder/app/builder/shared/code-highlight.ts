import { HighlightStyle } from "@codemirror/language";
import { highlightCode, tags } from "@lezer/highlight";
import { parser } from "@lezer/css";

// inspired by https://thememirror.net/solarized-light
export const solarizedLight = HighlightStyle.define([
  {
    tag: tags.comment,
    color: "#93A1A1",
  },
  {
    tag: tags.string,
    color: "#2AA198",
  },
  {
    tag: tags.regexp,
    color: "#D30102",
  },
  {
    tag: tags.number,
    color: "#D33682",
  },
  {
    tag: tags.variableName,
    color: "#268BD2",
  },
  {
    tag: [tags.keyword, tags.operator, tags.punctuation],
    color: "#859900",
  },
  {
    tag: [tags.definitionKeyword, tags.modifier],
    color: "#073642",
  },
  {
    tag: [tags.self, tags.definition(tags.propertyName)],
    color: "#268BD2",
  },
  {
    tag: tags.function(tags.variableName),
    color: "#268BD2",
  },
  {
    tag: [tags.bool, tags.null],
    color: "#B58900",
  },
  {
    tag: tags.tagName,
    color: "#268BD2",
  },
  {
    tag: tags.angleBracket,
    color: "#93A1A1",
  },
  {
    tag: tags.attributeName,
    color: "#93A1A1",
  },
  {
    tag: tags.typeName,
    color: "#859900",
  },
]);

export const highlightCss = (code: string) => {
  const styles = solarizedLight.module?.getRules();
  // generated classes are scoped to parent
  let highlightedCode = `<style>@scope {${styles}}</style>`;
  highlightCode(
    code,
    parser.parse(code),
    solarizedLight,
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
