import type {
  RgbValue,
  StyleProperty,
  StyleValue,
} from "@webstudio-is/css-data";
import type { EmbedTemplateStyleDecl } from "@webstudio-is/react-sdk";

const transparent: RgbValue = {
  type: "rgb",
  r: 0,
  g: 0,
  b: 0,
  alpha: 0,
};

const systemFont =
  'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"'
    .replace(/['"]/g, "")
    .split(/,\s*/);

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
    base: (theme) => [
      { property: "color", value: theme.foreground.base },
      {
        property: "fontSize",
        value: { type: "unit", value: theme.fontSize[2], unit: "px" },
      },
      {
        property: "fontFamily",
        value: { type: "fontFamily", value: systemFont },
      },
      {
        property: "width",
        value: { type: "unit", value: 100, unit: "%" },
      },
      ...expand("marginHorizontal", { type: "keyword", value: "auto" }),
      ...expand("borderRadius", {
        type: "unit",
        value: 0,
        unit: "px",
      }),
    ],
    sectionContainer: (theme) => [
      ...expand("padding", {
        type: "unit",
        value: theme.spacing[3],
        unit: "px",
      }),
    ],
    sectionContent: (theme) => [
      {
        property: "maxWidth",
        value: { type: "unit", value: 1024, unit: "px" },
      },
      ...expand("paddingHorizontal", {
        type: "unit",
        value: theme.spacing[3],
        unit: "px",
      }),
      ...expand("paddingVertical", {
        type: "unit",
        value: theme.spacing[1],
        unit: "px",
      }),
    ],
    logoNav: (theme) => [
      { property: "display", value: { type: "keyword", value: "flex" } },
      {
        property: "justifyContent",
        value: { type: "keyword", value: "space-between" },
      },
      { property: "alignItems", value: { type: "keyword", value: "center" } },
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
      ...expand("borderRadius", {
        type: "unit",
        value: theme.borderRadius[2],
        unit: "px",
      }),
      ...expand("padding", {
        type: "unit",
        value: theme.spacing[3],
        unit: "px",
      }),
    ],
  },
  Button: {
    base: (theme) => [
      { property: "backgroundColor", value: theme.background.base },
      { property: "color", value: theme.foreground.base },
      { property: "cursor", value: { type: "keyword", value: "pointer" } },
      ...expand("borderWidth", {
        type: "unit",
        value: 1,
        unit: "px",
      }),
      ...expand("borderStyle", { type: "keyword", value: "solid" }),
      ...expand("borderColor", theme.background.base),
      ...expand("borderRadius", {
        type: "unit",
        value: theme.borderRadius[1],
        unit: "px",
      }),
      ...expand("paddingHorizontal", {
        type: "unit",
        value: theme.spacing[3],
        unit: "px",
      }),
      ...expand("paddingVertical", {
        type: "unit",
        value: theme.spacing[2],
        unit: "px",
      }),
    ],
    primary: (theme) => [
      { property: "backgroundColor", value: theme.background.accent },
      { property: "color", value: theme.foreground.accent },
      ...expand("borderColor", theme.background.accent),
    ],
    secondary: (theme) => [
      { property: "backgroundColor", value: theme.background.secondary },
      { property: "color", value: theme.foreground.secondary },
      ...expand("borderColor", theme.background.secondary),
    ],
    outline: (theme) => [
      { property: "backgroundColor", value: transparent },
      ...expand("borderWidth", {
        type: "unit",
        value: 1,
        unit: "px",
      }),
      ...expand("borderStyle", { type: "keyword", value: "solid" }),
      ...expand("borderColor", theme.foreground.base),
    ],
    round: (theme) => [
      ...expand("borderRadius", {
        type: "unit",
        value: 1.3,
        unit: "em",
      }),
    ],
    square: (theme) => [
      ...expand("borderRadius", {
        type: "unit",
        value: 0,
        unit: "px",
      }),
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
      ...expand("borderRadius", {
        type: "unit",
        value: theme.borderRadius[1],
        unit: "px",
      }),
    ],
    block: (theme) => [
      {
        property: "display",
        value: { type: "keyword", value: "inline-block" },
      },
      ...expand("borderRadius", {
        type: "unit",
        value: theme.borderRadius[3],
        unit: "px",
      }),
      ...expand("paddingHorizontal", {
        type: "unit",
        value: theme.spacing[3],
        unit: "px",
      }),
      ...expand("paddingVertical", {
        type: "unit",
        value: theme.spacing[2],
        unit: "px",
      }),
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
        value: { type: "unit", value: theme.fontSize[4], unit: "px" },
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
        value: { type: "unit", value: theme.fontSize[8], unit: "px" },
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
      ...expand("borderRadius", {
        type: "unit",
        value: theme.borderRadius[4],
        unit: "px",
      }),
    ],
    noRounded: (theme) => [
      ...expand("borderRadius", {
        type: "unit",
        value: 0,
        unit: "px",
      }),
    ],
    roundedSmall: (theme) => [
      ...expand("borderRadius", {
        type: "unit",
        value: theme.borderRadius[1],
        unit: "px",
      }),
    ],
    circle: (theme) => [
      ...expand("borderRadius", {
        type: "unit",
        value: 100,
        unit: "%",
      }),
    ],
  },
  Input: {
    base: (theme) => [
      {
        property: "width",
        value: { type: "unit", value: 100, unit: "%" },
      },
      { property: "backgroundColor", value: theme.background.input },
      { property: "color", value: theme.foreground.input },
      ...expand("borderRadius", {
        type: "unit",
        value: theme.borderRadius[1],
        unit: "px",
      }),
      ...expand("borderWidth", {
        type: "unit",
        value: 1,
        unit: "px",
      }),
      ...expand("borderStyle", { type: "keyword", value: "solid" }),
      ...expand("borderColor", theme.background.input),
      ...expand("paddingHorizontal", {
        type: "unit",
        value: theme.spacing[3],
        unit: "px",
      }),
      ...expand("paddingVertical", {
        type: "unit",
        value: theme.spacing[2],
        unit: "px",
      }),
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
        property: "textDecorationLine",
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
      ...expand("padding", {
        type: "unit",
        value: 0,
        unit: "px",
      }),
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
  RichTextLink: {
    base: (theme) => [
      { property: "color", value: theme.foreground.accent },
      {
        property: "textDecorationLine",
        value: { type: "keyword", value: "none" },
      },
    ],
  },
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
      {
        property: "fontSize",
        value: { type: "unit", value: theme.fontSize[2], unit: "px" },
      },
      {
        property: "fontFamily",
        value: { type: "fontFamily", value: systemFont },
      },
    ],
    subtle: (theme) => [{ property: "color", value: theme.foreground.subtle }],
    small: (theme) => [
      {
        property: "fontSize",
        value: { type: "unit", value: theme.fontSize[0], unit: "px" },
      },
    ],
    medium: (theme) => [
      {
        property: "fontSize",
        value: { type: "unit", value: theme.fontSize[3], unit: "px" },
      },
    ],
    large: (theme) => [
      {
        property: "fontSize",
        value: { type: "unit", value: theme.fontSize[6], unit: "px" },
      },
    ],
  },
  Textarea: {
    base: (theme) => [
      {
        property: "width",
        value: { type: "unit", value: 100, unit: "%" },
      },
      { property: "backgroundColor", value: theme.background.input },
      { property: "color", value: theme.foreground.input },
      ...expand("borderWidth", {
        type: "unit",
        value: 1,
        unit: "px",
      }),
      ...expand("borderStyle", { type: "keyword", value: "solid" }),
      ...expand("borderColor", theme.background.input),
      ...expand("borderRadius", {
        type: "unit",
        value: theme.borderRadius[1],
        unit: "px",
      }),
      ...expand("paddingHorizontal", {
        type: "unit",
        value: theme.spacing[3],
        unit: "px",
      }),
      ...expand("paddingVertical", {
        type: "unit",
        value: theme.spacing[2],
        unit: "px",
      }),
    ],
  },
  // Vimeo: {}
  // VimeoPlayButton: {}
  // VimeoPreviewImage: {}
  // VimeoSpinner: {}
};

// @todo remove all the as EmbedTemplateStyleDecl
const expand = function expand(
  property: StyleProperty | string,
  value: StyleValue
): EmbedTemplateStyleDecl[] {
  if (property.endsWith("Horizontal")) {
    return ["Right", "Left"].map(
      (side) =>
        ({
          property: `${property.slice(0, -10)}${side}`,
          value,
        } as EmbedTemplateStyleDecl)
    );
  }

  if (property.endsWith("Vertical")) {
    return ["Top", "Bottom"].map(
      (side) =>
        ({
          property: `${property.slice(0, -8)}${side}`,
          value,
        } as EmbedTemplateStyleDecl)
    );
  }

  if (property === "margin" || property === "padding") {
    return ["Top", "Right", "Bottom", "Left"].map(
      (side) =>
        ({ property: `${property}${side}`, value } as EmbedTemplateStyleDecl)
    );
  }

  if (property === "borderRadius") {
    return ["TopRight", "TopLeft", "BottomRight", "BottomLeft"].map(
      (side) =>
        ({ property: `border${side}Radius`, value } as EmbedTemplateStyleDecl)
    );
  } else if (property.startsWith("border")) {
    return ["Top", "Right", "Bottom", "Left"].map(
      (side) =>
        ({
          property: `border${side}${property.slice(6)}`,
          value,
        } as EmbedTemplateStyleDecl)
    );
  }

  return [{ property, value } as EmbedTemplateStyleDecl];
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
