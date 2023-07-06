import type {
  RgbValue,
  StyleProperty,
  StyleValue,
} from "@webstudio-is/css-data";
import type { EmbedTemplateStyleDecl } from "@webstudio-is/react-sdk";
import { svgToBase64 } from "../../../utils/to-base64";

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
  Record<
    string,
    (theme: any, colorMode?: "light" | "dark") => EmbedTemplateStyleDecl[]
  >
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
    base: (theme, colorMode = "light") => [
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
    topLevelContainer: (theme) => [
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
    horizontalNavigation: (theme) => [
      { property: "display", value: { type: "keyword", value: "flex" } },
      {
        property: "rowGap",
        value: { type: "unit", value: theme.spacing[3], unit: "number" },
      },
      {
        property: "columnGap",
        value: { type: "unit", value: theme.spacing[3], unit: "number" },
      },
    ],
    rightAlignedNavigation: (theme) => [
      { property: "display", value: { type: "keyword", value: "flex" } },
      {
        property: "justifyContent",
        value: { type: "keyword", value: "flex-end" },
      },
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
        value: theme.borderRadius[4],
        unit: "px",
      }),
      ...expand("padding", {
        type: "unit",
        value: theme.spacing[3],
        unit: "px",
      }),
    ],
    gradientVertical: (theme) => {
      const gradient =
        theme.gradients[Math.floor(Math.random() * theme.gradients.length)];

      return [
        {
          property: "backgroundImage",
          value: {
            type: "layers",
            value: [
              {
                type: "keyword",
                value: `linear-gradient(180deg, ${gradient[0]}, ${gradient[1]})`,
              },
            ],
          },
        },
      ];
    },
    gradient45degrees: (theme) => {
      const gradient =
        theme.gradients[Math.floor(Math.random() * theme.gradients.length)];

      return [
        {
          property: "backgroundImage",
          value: {
            type: "layers",
            value: [
              {
                type: "keyword",
                value: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
              },
            ],
          },
        },
      ];
    },
    withBackgroundPattern: (theme, colorMode) => {
      const bgs = Object.values(backgroundPatterns);
      const pattern = bgs[Math.floor(Math.random() * bgs.length)];

      return [
        {
          property: "backgroundImage",
          value: {
            type: "layers",
            value: [
              {
                type: "image",
                value: {
                  type: "url",
                  url: pattern(
                    colorMode === "light"
                      ? "rgba(0,0,0,0.2)"
                      : "rgba(255,255,255,0.2)"
                  ),
                },
              },
            ],
          },
        },
      ];
    },
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
      { property: "whiteSpace", value: { type: "keyword", value: "nowrap" } },
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
    navLink: (theme) => [
      { property: "whiteSpace", value: { type: "keyword", value: "nowrap" } },
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

export const backgroundPatterns = {
  dots: (color: string) =>
    svgToBase64(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">\n  <defs>\n    <pattern id="grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">\n      <circle cx="10" cy="10" r="1" fill="${color}" />\n    </pattern>\n  </defs>\n  <rect width="100%" height="100%" fill="url(#grid-pattern)" />\n</svg>`
    ),
  doubleDots: (color: string) =>
    svgToBase64(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">\n  <pattern id="stars" width="50" height="50" patternUnits="userSpaceOnUse">\n    <circle cx="25" cy="25" r="2" fill="rgba(0,0,0,0.1)" />\n    <circle cx="12.5" cy="12.5" r="1" fill="${color}" />\n  </pattern>\n  <rect fill="url(#stars)" width="100%" height="100%" />\n</svg>`
    ),
  graph: (color: string) =>
    svgToBase64(
      `<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><g fill-rule='evenodd'><g fill='${color}' fill-opacity='0.28'><path opacity='.5' d='M96 95h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9zm-1 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9z'/><path d='M6 5V0H5v5H0v1h5v94h1V6h94V5H6z'/></g></g></svg>`
    ),
  cross: (color: string) =>
    svgToBase64(
      `<svg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'><g fill='none' fill-rule='evenodd'><g fill='${color}' fill-opacity='0.4'><path d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/></g></g></svg>`
    ),
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
