#### Base theme

Hardcoded, merged with generated theme

```
type Size: "xs" | "s" | "m" | "l" | "xl" | "2xl" |"3xl" |"4xl";
```

```json
{
  "fontSize": {
    "xs": 10,
    "s": 12,
    "m": 14,
    "l": 16,
    "xl": 18,
    "2xl": 20,
    "3xl": 24,
    "4xl": 28
  },
  "spacing": {
    "xs": 4,
    "s": 8,
    "m": 12,
    "l": 16,
    "xl": 20,
    "2xl": 24,
    "3xl": 28,
    "4xl": 32
  },
  "borderRadius": {
    "xs": 2,
    "s": 4,
    "m": 6,
    "l": 8,
    "xl": 10,
    "2xl": 12,
    "3xl": 16,
    "4xl": 20
  }
}
```

## Theme

You are a designer and the client came to you with the following request:

```
{request}
```

Your task is to:

- Produce a theme for the request: we will use in the final designs. Select colors (their hex value) from the Tailwind CSS color palette. Gradients and shadow colors should be on brand with the theme `colors` and text should be readable.
- Determine whether the design should be in light or dark mode

Respond with a JSON object that strictly follows the following TypeScript definitions:

```typescript
type RgbaColor = string;
type Theme = {
  colorMode: "light" | "dark";
  theme: {
    colors: HexColor[];
    text: HexColor[];
    gradients: [
      [HexColor, HexColor],
      [HexColor, HexColor],
      [HexColor, HexColor]
    ];
    fontFamily: {
      base: FontName; // generally a simple sans-serif font
      headings: FontName; // generally a simple sans-serif font
    };
    shadowsColors: [RgbaColor, RgbaColor, RgbaColor, RgbaColor];
  };
};
```

Respond with a valid JSON code block. Start with ```json

### Component styles

(From now on {theme} is the base theme merged with the generated theme from the previous step)

You are a design systems engineer. Given a theme and a list of components your task is to generate the design system styles (CSS) for the components. The goal is to have a components library that we can use to build websites and apps.

Theme:

```json
{theme}
```

Components:

{components}

Please use a single class per CSS rule and prefix it with the component name preserving its capitalization style.

Don't generate `:hover` styles or media queries.
Don't generate transitions and animations either.

Respond with a valid CSS code block. Start with ```css

### Component variants

You are a design system engineer. Given the CSS for the design systems components and the theme your task is to generate a few component CSS variants.

Theme:

```json
{theme}
```

The CSS for the design systems components:

```css
{component-styles}
```

Please generate only the variants that you think we might need when building websites. Perhaps not all components need variants!

The variant class name should start with the existing component class name as a prefix and continue with `--variantName` for example: `.Button--variantName`.

Don't generate `:hover` styles or media queries.
Don't generate transitions and animations either.

Respond with a valid CSS code block. Start with ```css

### Generate page

You are a design systems engineer. Your task is to create a page in JSX using the design system to accommodate the client request:

```
A website for a Denver brewery called Tart that specializes in sour beer. The vibe should be fresh, modem, with citrus motifs and lots of product imagery.
```

Design system components:

- Blockquote
- Bold
- Box
- Button
- Checkbox
- CodeText
- ErrorMessage
- Form
- Fragment
- Heading
- HtmlEmbed
- Image
- Input
- Italic
- Label
- Link
- List
- ListItem
- Paragraph
- RadioButton
- RichTextLink
- Separator
- Span
- Subscript
- SuccessMessage
- Superscript
- Text
- Textarea
- Vimeo
- VimeoPlayButton
- VimeoPreviewImage
- VimeoSpinner

Each component has already been styled but additionally can take related variant className:

```
.Input--error,.Textarea--error,.Blockquote--large,.Blockquote--small,.Button--secondary,.Button--success,.Button--warning,.Checkbox--large,.Checkbox--small,.CodeText--highlight,.CodeText--dark,.Heading--large,.Heading--small,.Label--small,.Input--disabled,.Label--bold,.Link--bold,.List--ordered,.ListItem--highlight,.Paragraph--highlight,.Text--highlight,.Span--italic,.Span--underline,.Text--light,.Textarea--disabled,.VimeoPlayButton--large,.VimeoPlayButton--small,.VimeoSpinner--large,.VimeoSpinner--small
```

Theme:

```json
{
  "fontSize": {
    "xs": 10,
    "s": 12,
    "m": 14,
    "l": 16,
    "xl": 18,
    "2xl": 20,
    "3xl": 24,
    "4xl": 28
  },
  "spacing": {
    "xs": 4,
    "s": 8,
    "m": 12,
    "l": 16,
    "xl": 20,
    "2xl": 24,
    "3xl": 28,
    "4xl": 32
  },
  "borderRadius": {
    "xs": 2,
    "s": 4,
    "m": 6,
    "l": 8,
    "xl": 10,
    "2xl": 12,
    "3xl": 16,
    "4xl": 20
  },
  "colors": [
    "#6B46C1",
    "#805AD5",
    "#9F7AEA",
    "#C084FC",
    "#D6BCFA",
    "#F3E8FF",
    "#1F2937",
    "#4B5563",
    "#6B7280",
    "#9CA3AF",
    "#D1D5DB"
  ],
  "text": ["#F3E8FF", "#D1D5DB", "#9CA3AF", "#6B7280", "#4B5563", "#1F2937"],
  "gradients": [
    ["#6B46C1", "#9F7AEA"],
    ["#805AD5", "#C084FC"],
    ["#D6BCFA", "#9F7AEA"]
  ],
  "fontFamily": { "base": "Inter", "headings": "Inter" },
  "shadowsColors": [
    "rgba(107, 70, 193, 0.2)",
    "rgba(107, 70, 193, 0.4)",
    "rgba(107, 70, 193, 0.6)",
    "rgba(107, 70, 193, 0.8)"
  ]
}
```

For layout add a `L-[number]` className but do not generate the CSS for it.

Other constraints and requirements:

- Don't import or use any dependency or external library.
- Don't use JSX comments.
- Organize content in sections with interesting layouts.
- Use short placeholder text.
- Don't add any prop to components!
- Use images to make the page look more interesting.
- Add an `alt` prop to Image instances with a description that is no longer than 32 characters.

Respond with a valid JSX code block. Start with ```jsx
