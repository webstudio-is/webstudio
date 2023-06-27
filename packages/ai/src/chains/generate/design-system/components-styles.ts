import type { EmbedTemplateStyleDecl } from "@webstudio-is/react-sdk";

const transparent = {
  type: "rgb",
  r: 0,
  g: 0,
  b: 0,
  alpha: 0,
};

export const componentsStyles: Record<
  string,
  Record<string, (theme: any) => EmbedTemplateStyleDecl[]>
> = {
  Blockquote: {
    base: (theme) => [
      {
        property: "borderLeftWidth",
        value: { type: "unit", value: 2, unit: "px" },
      },
      {
        property: "borderLeftStyle",
        value: { type: "keyword", value: "solid" },
      },
      { property: "borderLeftColor", value: theme.foreground.base },
      {
        property: "paddingLeft",
        value: { type: "unit", value: theme.spacing[2], unit: "px" },
      },
    ],
  },
  Bold: {
    base: (theme) => [
      { property: "color", value: theme.foreground.base },
      { property: "fontWeight", value: { type: "keyword", value: "bold" } },
    ],
  },
  Box: {
    base: (theme) => [],
    landingSection: (theme) => [
      {
        property: "paddingLeft",
        value: { type: "unit", value: theme.spacing[3], unit: "px" },
      },
      {
        property: "paddingRight",
        value: { type: "unit", value: theme.spacing[3], unit: "px" },
      },
      {
        property: "paddingTop",
        value: { type: "unit", value: theme.spacing[3], unit: "px" },
      },
      {
        property: "paddingBottom",
        value: { type: "unit", value: theme.spacing[3], unit: "px" },
      },
    ],
    card: (theme) => [
      { property: "backgroundColor", value: theme.background.base },
      { property: "color", value: theme.foreground.base },
      {
        property: "boxShadow",
        value: {
          type: "keyword",
          value: `0 3px 8px ${theme.shadowsColors[0]}`,
        },
      },
      {
        property: "borderTopLeftRadius",
        value: { type: "unit", value: theme.borderRadius[2], unit: "px" },
      },
      {
        property: "borderTopRightRadius",
        value: { type: "unit", value: theme.borderRadius[2], unit: "px" },
      },
      {
        property: "borderBottomRightRadius",
        value: { type: "unit", value: theme.borderRadius[2], unit: "px" },
      },
      {
        property: "borderBottomLeftRadius",
        value: { type: "unit", value: theme.borderRadius[2], unit: "px" },
      },
      {
        property: "paddingLeft",
        value: { type: "unit", value: theme.spacing[3], unit: "px" },
      },
      {
        property: "paddingRight",
        value: { type: "unit", value: theme.spacing[3], unit: "px" },
      },
      {
        property: "paddingTop",
        value: { type: "unit", value: theme.spacing[3], unit: "px" },
      },
      {
        property: "paddingBottom",
        value: { type: "unit", value: theme.spacing[3], unit: "px" },
      },
    ],
  },
  Button: {
    base: (theme) => [
      { property: "backgroundColor", value: theme.background.base },
      { property: "color", value: theme.foreground.base },
      {
        property: "borderTopWidth",
        value: { type: "unit", value: 1, unit: "px" },
      },
      {
        property: "borderRightWidth",
        value: { type: "unit", value: 1, unit: "px" },
      },
      {
        property: "borderBottomWidth",
        value: { type: "unit", value: 1, unit: "px" },
      },
      {
        property: "borderLeftWidth",
        value: { type: "unit", value: 1, unit: "px" },
      },
      {
        property: "borderTopStyle",
        value: { type: "keyword", value: "solid" },
      },
      {
        property: "borderRightStyle",
        value: { type: "keyword", value: "solid" },
      },
      {
        property: "borderBottomStyle",
        value: { type: "keyword", value: "solid" },
      },
      {
        property: "borderLeftStyle",
        value: { type: "keyword", value: "solid" },
      },
      {
        property: "borderTopColor",
        value: theme.background.base,
      },
      {
        property: "borderRightColor",
        value: theme.background.base,
      },
      {
        property: "borderBottomColor",
        value: theme.background.base,
      },
      {
        property: "borderLeftColor",
        value: theme.background.base,
      },
      {
        property: "borderTopLeftRadius",
        value: { type: "unit", value: theme.borderRadius[1], unit: "px" },
      },
      {
        property: "borderTopRightRadius",
        value: { type: "unit", value: theme.borderRadius[1], unit: "px" },
      },
      {
        property: "borderBottomRightRadius",
        value: { type: "unit", value: theme.borderRadius[1], unit: "px" },
      },
      {
        property: "borderBottomLeftRadius",
        value: { type: "unit", value: theme.borderRadius[1], unit: "px" },
      },
      {
        property: "paddingLeft",
        value: { type: "unit", value: theme.spacing[3], unit: "px" },
      },
      {
        property: "paddingRight",
        value: { type: "unit", value: theme.spacing[3], unit: "px" },
      },
      {
        property: "paddingTop",
        value: { type: "unit", value: theme.spacing[2], unit: "px" },
      },
      {
        property: "paddingBottom",
        value: { type: "unit", value: theme.spacing[2], unit: "px" },
      },
    ],
    primary: (theme) => [
      { property: "backgroundColor", value: theme.background.accent },
      { property: "color", value: theme.foreground.accent },
      {
        property: "borderTopColor",
        value: theme.background.accent,
      },
      {
        property: "borderRightColor",
        value: theme.background.accent,
      },
      {
        property: "borderBottomColor",
        value: theme.background.accent,
      },
      {
        property: "borderLeftColor",
        value: theme.background.accent,
      },
    ],
    secondary: (theme) => [
      { property: "backgroundColor", value: theme.background.secondary },
      { property: "color", value: theme.foreground.secondary },
      {
        property: "borderTopColor",
        value: theme.background.secondary,
      },
      {
        property: "borderRightColor",
        value: theme.background.secondary,
      },
      {
        property: "borderBottomColor",
        value: theme.background.secondary,
      },
      {
        property: "borderLeftColor",
        value: theme.background.secondary,
      },
    ],
    outline: (theme) => [
      { property: "backgroundColor", value: transparent },
      { property: "backgroundColor", value: theme.background.base },
    ],
  },
  // Checkbox: {},
  CodeText: {
    base: (theme) => [
      {
        property: "display",
        value: { type: "keyword", value: "inline-block" },
      },
      {
        property: "fontFamily",
        value: { type: "fontFamily", value: ["monospace"] },
      },
      { property: "backgroundColor", value: theme.background.secondary },
      { property: "color", value: theme.foreground.secondary },
      {
        property: "borderTopLeftRadius",
        value: { type: "unit", value: theme.borderRadius[1], unit: "px" },
      },
      {
        property: "borderTopRightRadius",
        value: { type: "unit", value: theme.borderRadius[1], unit: "px" },
      },
      {
        property: "borderBottomRightRadius",
        value: { type: "unit", value: theme.borderRadius[1], unit: "px" },
      },
      {
        property: "borderBottomLeftRadius",
        value: { type: "unit", value: theme.borderRadius[1], unit: "px" },
      },
    ],
    block: (theme) => [
      {
        property: "display",
        value: { type: "keyword", value: "inline-block" },
      },
      {
        property: "borderTopLeftRadius",
        value: { type: "unit", value: theme.borderRadius[3], unit: "px" },
      },
      {
        property: "borderTopRightRadius",
        value: { type: "unit", value: theme.borderRadius[3], unit: "px" },
      },
      {
        property: "borderBottomRightRadius",
        value: { type: "unit", value: theme.borderRadius[3], unit: "px" },
      },
      {
        property: "borderBottomLeftRadius",
        value: { type: "unit", value: theme.borderRadius[3], unit: "px" },
      },

      {
        property: "paddingLeft",
        value: { type: "unit", value: theme.spacing[3], unit: "px" },
      },
      {
        property: "paddingRight",
        value: { type: "unit", value: theme.spacing[3], unit: "px" },
      },
      {
        property: "paddingTop",
        value: { type: "unit", value: theme.spacing[2], unit: "px" },
      },
      {
        property: "paddingBottom",
        value: { type: "unit", value: theme.spacing[2], unit: "px" },
      },
    ],
  },
  // ErrorMessage: {}
  Heading: {
    base: (theme) => [
      {
        property: "fontFamily",
        value: { type: "fontFamily", value: [theme.fontFamily.headings] },
      },
      {
        property: "fontSize",
        value: { type: "unit", value: theme.fontSize[6], unit: "px" },
      },
    ],
    small: (theme) => [
      {
        property: "fontSize",
        value: { type: "unit", value: theme.fontSize[3], unit: "px" },
      },
    ],
    medium: (theme) => [
      {
        property: "fontSize",
        value: { type: "unit", value: theme.fontSize[5], unit: "px" },
      },
    ],
    large: (theme) => [
      {
        property: "fontSize",
        value: { type: "unit", value: theme.fontSize[7], unit: "px" },
      },
    ],
  },
  // HtmlEmbed: {}
  Image: {
    base: (theme) => [
      {
        property: "maxWidth",
        value: { type: "unit", value: 100, unit: "%" },
      },
      {
        property: "maxHeight",
        value: { type: "unit", value: 100, unit: "%" },
      },
      {
        property: "minWidth",
        value: { type: "unit", value: 1, unit: "px" },
      },
    ],
    rounded: (theme) => [
      {
        property: "borderTopLeftRadius",
        value: { type: "unit", value: theme.borderRadius[4], unit: "px" },
      },
      {
        property: "borderTopRightRadius",
        value: { type: "unit", value: theme.borderRadius[4], unit: "px" },
      },
      {
        property: "borderBottomRightRadius",
        value: { type: "unit", value: theme.borderRadius[4], unit: "px" },
      },
      {
        property: "borderBottomLeftRadius",
        value: { type: "unit", value: theme.borderRadius[4], unit: "px" },
      },
    ],
    roundedSmall: (theme) => [
      {
        property: "borderTopLeftRadius",
        value: { type: "unit", value: theme.borderRadius[1], unit: "px" },
      },
      {
        property: "borderTopRightRadius",
        value: { type: "unit", value: theme.borderRadius[1], unit: "px" },
      },
      {
        property: "borderBottomRightRadius",
        value: { type: "unit", value: theme.borderRadius[1], unit: "px" },
      },
      {
        property: "borderBottomLeftRadius",
        value: { type: "unit", value: theme.borderRadius[1], unit: "px" },
      },
    ],
    circle: (theme) => [
      {
        property: "borderTopLeftRadius",
        value: { type: "unit", value: 100, unit: "%" },
      },
      {
        property: "borderTopRightRadius",
        value: { type: "unit", value: 100, unit: "%" },
      },
      {
        property: "borderBottomRightRadius",
        value: { type: "unit", value: 100, unit: "%" },
      },
      {
        property: "borderBottomLeftRadius",
        value: { type: "unit", value: 100, unit: "%" },
      },
    ],
  },
  Input: {
    base: (theme) => [
      { property: "backgroundColor", value: theme.background.input },
      { property: "color", value: theme.foreground.input },
      {
        property: "borderTopLeftRadius",
        value: { type: "unit", value: theme.borderRadius[1], unit: "px" },
      },
      {
        property: "borderTopRightRadius",
        value: { type: "unit", value: theme.borderRadius[1], unit: "px" },
      },
      {
        property: "borderBottomRightRadius",
        value: { type: "unit", value: theme.borderRadius[1], unit: "px" },
      },
      {
        property: "borderBottomLeftRadius",
        value: { type: "unit", value: theme.borderRadius[1], unit: "px" },
      },
      {
        property: "paddingLeft",
        value: { type: "unit", value: theme.spacing[3], unit: "px" },
      },
      {
        property: "paddingRight",
        value: { type: "unit", value: theme.spacing[3], unit: "px" },
      },
      {
        property: "paddingTop",
        value: { type: "unit", value: theme.spacing[2], unit: "px" },
      },
      {
        property: "paddingBottom",
        value: { type: "unit", value: theme.spacing[2], unit: "px" },
      },
    ],
  },
  Italic: {
    base: (theme) => [
      {
        property: "fontStyle",
        value: { type: "keyword", value: "italic" },
      },
    ],
  },
  Link: {
    base: (theme) => [
      { property: "color", value: theme.foreground.accent },
      {
        property: "textDecorationStyle",
        value: { type: "keyword", value: "none" },
      },
    ],
  },
  List: {
    base: (theme) => [
      {
        property: "listStyleType",
        value: { type: "keyword", value: "none" },
      },
      {
        property: "paddingLeft",
        value: { type: "unit", value: 0, unit: "px" },
      },
      {
        property: "paddingRight",
        value: { type: "unit", value: 0, unit: "px" },
      },
      {
        property: "paddingTop",
        value: { type: "unit", value: 0, unit: "px" },
      },
      {
        property: "paddingBottom",
        value: { type: "unit", value: 0, unit: "px" },
      },
    ],
  },
  ListItem: {
    base: (theme) => [
      {
        property: "listStyleType",
        value: { type: "keyword", value: "none" },
      },
    ],
  },
  // Paragraph: {}
  // RadioButton: {}
  // RichTextLink: {}
  Separator: {
    base: (theme) => [
      { property: "backgroundColor", value: theme.background.input },
      { property: "height", value: { type: "unit", value: 1, unit: "px" } },
    ],
  },
  // Span: {},
  // Subscript: {},
  // SuccessMessage: {},
  // Superscript: {},
  Text: {
    base: (theme) => [
      { property: "color", value: theme.foreground.base },
      {
        property: "fontSize",
        value: { type: "unit", value: theme.fontSize[3], unit: "px" },
      },
    ],
    subtle: (theme) => [{ property: "color", value: theme.foreground.subtle }],
    small: (theme) => [
      {
        property: "fontSize",
        value: { type: "unit", value: theme.fontSize[2], unit: "px" },
      },
    ],
    medium: (theme) => [
      {
        property: "fontSize",
        value: { type: "unit", value: theme.fontSize[5], unit: "px" },
      },
    ],
    large: (theme) => [
      {
        property: "fontSize",
        value: { type: "unit", value: theme.fontSize[7], unit: "px" },
      },
    ],
  },
  Textarea: {
    base: (theme) => [
      { property: "backgroundColor", value: theme.background.input },
      { property: "color", value: theme.foreground.input },
      {
        property: "borderTopLeftRadius",
        value: { type: "unit", value: theme.borderRadius[1], unit: "px" },
      },

      {
        property: "paddingLeft",
        value: { type: "unit", value: theme.spacing[3], unit: "px" },
      },
      {
        property: "paddingRight",
        value: { type: "unit", value: theme.spacing[3], unit: "px" },
      },
      {
        property: "paddingTop",
        value: { type: "unit", value: theme.spacing[2], unit: "px" },
      },
      {
        property: "paddingBottom",
        value: { type: "unit", value: theme.spacing[2], unit: "px" },
      },
    ],
  },
  // Vimeo: {}
  // VimeoPlayButton: {}
  // VimeoPreviewImage: {}
  // VimeoSpinner: {}
};

// - Blockquote
// - Bold
// - Box
// - Button
// - Checkbox
// - CodeText
// - ErrorMessage
// - Form
// - Fragment
// - Heading
// - HtmlEmbed
// - Image
// - Input
// - Italic
// - Label
// - Link
// - List
// - ListItem
// - Paragraph
// - RadioButton
// - RichTextLink
// - Separator
// - Span
// - Subscript
// - SuccessMessage
// - Superscript
// - Text
// - Textarea
// - Vimeo
// - VimeoPlayButton
// - VimeoPreviewImage
// - VimeoSpinner
