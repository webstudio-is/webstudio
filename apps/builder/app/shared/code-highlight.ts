import { HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { cssVar } from "@webstudio-is/design-system";

// Syntax categories are a visualization layer. Compose them from the shared
// semantic palette so they adapt to both schemes without adding theme knobs.
const syntaxColor = (hueRotation: number) =>
  `color-mix(
    in oklab,
    color(
      from oklch(from ${cssVar("--foreground-accent")} l c calc(h + ${hueRotation}))
      srgb clamp(0, r, 1) clamp(0, g, 1) clamp(0, b, 1)
    ) 80%,
    ${cssVar("--foreground-primary")}
  )`;

const syntaxGreen = syntaxColor(-120);
const syntaxRed = syntaxColor(125);
const syntaxYellow = syntaxColor(-155);
const syntaxPurple = syntaxColor(55);

export const codeHighlightStyle = HighlightStyle.define([
  {
    tag: tags.comment,
    color: cssVar("--foreground-secondary"),
  },
  {
    tag: tags.string,
    color: syntaxGreen,
  },
  {
    tag: tags.regexp,
    color: syntaxRed,
  },
  {
    tag: tags.number,
    color: syntaxPurple,
  },
  {
    tag: tags.variableName,
    color: cssVar("--foreground-accent"),
  },
  {
    tag: [tags.keyword, tags.operator, tags.punctuation],
    color: syntaxGreen,
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
    color: syntaxYellow,
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
    color: syntaxGreen,
  },
]);
