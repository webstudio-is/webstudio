- a website for a bakery in San Francisco called "The Bakery", they make amazing pastires and coffee. They do deliveries.

- a website for a Denver brewery called Tart that specializes in sour beer. The vibe should be fresh, modern, with citrus motifs and lots of product imagery.

- a website for a financial startup that's building a tool (called Runway) that helps business understand their finances, collaborate together, and answer questions they have about how it operates and what might happen in a variety of scenarios. This app is used by many of the best startups and operators around.

https://prompts.framer.ai/

#f2f0e4,#ffdbc5,#f6c4d2,#e3c2f2,#c3d8e6,#9dd1df,#a2e8e5,#dbf4b4,#e5efd7,#ffe6a7

Using the default Tailwind CSS theme generate a color palette for the following design request.

The design request:

Design a calming and user-friendly landing page for a holistic Yoga studio, focusing on offering Yoga classes and courses for all, run by a certified Yoga instructor. Reflect the universal accessibility of yoga and the expertise of the instructor through the website's design and layout.

Response:

Pick only 10 relevant colors from Tailwind CSS and return them as a comma separate list of colors eg. `#f00f1a,#bc30e3`. The colors will be used for backgrounds, text, borders etc. so make sure that they complement each other and some can use as readable text color on top of the others.

Respond only with a code block containing the colors list and start with #

---

You are a design system expert and your task is to generate the CSS for a reusable component library. The component library will be used for building pages and sections of websites therefore it must be comprehensive.

Design tokens:

- Color palette: #F9FAFB, #CBD5E0, #A0AEC0, #718096, #4A5568, #2D3748, #1A202C, #E2E8F0, #A3BFFA, #667EEA
- Spacing Scale: 3px, 6px, 8px, 12px, 14px, 16px, 32px, 48px, 64px, 100px
- Border radii: 3px, 6px, 12px
- Shadows (replace `{hex-color}` with a color from the palette or black with low alpha value):
  - s: `0 2px 4px {hex-color}`
  - m: `0 4px 16px {hex-color}`
  - l: `0 8px 24px {hex-color}`
  - xl: `0 12px 48px {hex-color}`

Color Mode:

The project is in light-mode.

Components:

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

Requirements:

For each component generate all the variants necessary as CSS rules. Each rule's selector is a single class name that must ad-here to the following naming convention:

```
.ds-{ComponentName}[--variantName]
```

The styles must be production-ready and usable in HTML right away.

**Very important**: don't generate empty CSS rules!

Respond only with a CSS code block without any comment or other explanation. Start with ```css

---

Generate a JSX tree to fulfill the follow request:

Design a calming and user-friendly landing page for a holistic Yoga studio, focusing on offering Yoga classes and courses for all, run by a certified Yoga instructor. Reflect the universal accessibility of yoga and the expertise of the instructor through the website's design and layout.

Use exclusively the Components and the CSS classes below:

Components:

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

Don't add any prop other than `className` to the components.
Use only placeholder text and no JavaScript.

CSS classes:

```
ds-Bold,ds-Box,ds-Button,ds-Checkbox,ds-CodeText,ds-ErrorMessage,ds-Form,ds-Fragment,ds-Heading,ds-HtmlEmbed,ds-Image,ds-Input,ds-Italic,ds-Label,ds-Link,ds-List,ds-ListItem,ds-Paragraph,ds-RadioButton,ds-RichTextLink,ds-Separator,ds-Span,ds-Subscript,ds-SuccessMessage,ds-Superscript,ds-Text,ds-Textarea,ds-Vimeo,ds-VimeoPlayButton,ds-VimeoPreviewImage,ds-VimeoSpinner
```

Respond with a JSX code block. Start with ```jsx

---

# Tailwind

Using HTML and Tailwind CSS classes only generate a webpage for the following request:

```
Design a calming and user-friendly landing page for a holistic Yoga studio, focusing on offering Yoga classes and courses for all, run by a certified Yoga instructor. Reflect the universal accessibility of yoga and the expertise of the instructor through the website's design and layout.
```

Use `div` as main container rather than `body`. Do not set any styles on this element.

Most but not all sections should be 100vh. Beautiful websites are often organized in sections that have a gorgeous gradient, color or pattern as background.

Use a mix of shadows, nice colors from the Tailwind CSS palette, background colors and gradients to make the result look well balanced, aesthetically pleasant and fit the vibe of the request. Don't limit yourself to white, black, grays and blue.

Add decorative images to make the page look more interesting. For images leave the `src` attribute empty and add a good description as `alt` attribute for screen readers.

Output only the HTML body (no doctype, head, scripts etc). Start with ```html

# Tailwind 2

Using HTML and Tailwind CSS classes only generate a webpage or a section of it based on the following request:

```
Design a calming and user-friendly landing page for a holistic Yoga studio, focusing on offering Yoga classes and courses for all, run by a certified Yoga instructor. Reflect the universal accessibility of yoga and the expertise of the instructor through the website's design and layout.
```

Use `div` as main container rather than `body`. Do not set any styles on this element.

One or two sections should be 100vh.

Beautiful websites are often organized in sections that have a gorgeous light gradient, color or pattern as background. Generally very light and subtle gradient colors are preferred. However don't use gradients on every section.

Alternate background gradients and flat background colors for page sections.

Add decorative images to make the page look more interesting. For images leave the `src` attribute empty and add a good description as `alt` attribute for screen readers.

Add widgets, CTAs and page elements as you see them fit.

Output only the HTML body (no doctype, head, scripts etc). Start with ```html

# Tailwind 3

Using HTML and Tailwind CSS classes only generate a webpage or a section of it based on the following request:

```
A landing page for a product called Webstudio. Similar to Webflow, Webstudio visually translates CSS without obscuring it, giving designers superpowers that were exclusive to developers in the past. The page has a navigation at the top, a big hero section with two CTAs and a screenshot of the tool.
```

Use `div` as main container rather than `body`. Do not set any styles on this element.

One or two sections should be 100vh.

Beautiful websites are often organized in sections that have a gorgeous light gradient, color or pattern as background. Generally very light and consistent gradient colors are preferred and gradients should be consistent and not too different from each other.

Alternate background gradients and flat background colors for page sections.

Sections often include images to make the page look more interesting. For images leave the `src` attribute empty and add a good description as `alt` attribute for screen readers.

Widgets, big headings, CTAs and page elements can also make the page look more interesting.

Output only the HTML body (no doctype, head, scripts etc). Start with ```html

# Tailwind 4

Using HTML and Tailwind CSS classes only generate a webpage based on the following request:

```
a page with the site title at the top, the page title below in big size, below is a one liner description of the page. Next is the featured blog posts section. It has a title that says "featured blog posts" and below a layout with two columns: on the left a big image for the post, the category, post title, excerpt and author avatar (an image with the author name next to it). On the right column there is a list of other blog posts. Each element is a two columns layout with a small image on the left and the same information about the blog post on the right.
```

Use `div` as main container rather than `body`. Do not set any styles on this element.

Often sections should be 100vh.
Sections should never touch the page edges.

Alternate background gradients and flat background colors for page sections.

Beautiful websites are often organized in sections that have a gorgeous dark gradient, color or pattern as background. Generally very dark and consistent gradient colors are preferred and gradients should be consistent and not too different from each other.

Sections often should include images to make the page look more interesting. For images leave the `src` attribute empty and add a good description as `alt` attribute for screen readers.

Widgets, big headings, CTAs and page elements can also make the page look more interesting and should be used.

Output only the HTML body (no doctype, head, scripts etc). Start with ```html

# Tailwind design system

Using Tailwind CSS classes only generate an production-grade and exhaustive amount of classes groups for the following elements:

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

The goal is to create a design system that I can use to build websites and apps, therefore I need a number of classes for each element base styles and variants as well as a small set of utilities for common tasks like: setting a few gradient backgrounds on page sections, making elements round with full border radius etc. Don't bother about page layout.

Use the following convention for elements:

```css
.ds-{ComponentName} { @apply /* and you, GPT, add a comma separated list of Tailwind CSS classes here */; }
.ds-{ComponentName}--someVariant { @apply /* and you, GPT, add a comma separated list of Tailwind CSS classes here */; }
```

and the following for utilities:

```css
.ds-Utils--{utilName} { @apply /* and you, GPT, add a comma separated list of Tailwind CSS classes here */; }
```

To save tokens, don't generate CSS comments.

The style of the design system should be in line with the following user request:

```
Design a calming and user-friendly landing page for a holistic Yoga studio, focusing on offering Yoga classes and courses for all, run by a certified Yoga instructor. Reflect the universal accessibility of yoga and the expertise of the instructor through the website's design and layout.
```

Beautiful websites are often organized in sections that have a gorgeous background gradient, color or pattern.

Use a mix of shadows, nice colors from the Tailwind CSS palette, background colors and gradients to make the result look aesthetically pleasant. Don't limit yourself to white, black, grays and blue.

Start with ```css

# Tailwind design system

Using the Tailwind CSS theme only generate an production-grade and exhaustive amount of CSS for the following elements:

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

The goal is to create a design system that I can use to build websites and apps, therefore I need a number of classes for each element base styles and variants as well as a small set of utilities for common tasks like: setting a few gradient backgrounds on page sections, making elements round with full border radius etc. Don't bother about page layout.

Use the following convention for elements:

```css
.ds-{ComponentName} { display: block; margin: 10px 20px; color: #ef4444/ }
.ds-{ComponentName}--someVariant { color: #ec4899 }
```

and the following for utilities:

```css
.ds-Utils--{utilName} { background-image: linear-gradient(to right, rgb(192, 132, 252), rgb(236, 72, 153), rgb(239, 68, 68)) }
```

To save tokens, don't generate CSS comments.

The style of the design system should be in line with the following user request:

```
Design a calming and user-friendly landing page for a holistic Yoga studio, focusing on offering Yoga classes and courses for all, run by a certified Yoga instructor. Reflect the universal accessibility of yoga and the expertise of the instructor through the website's design and layout.
```

Beautiful websites are often organized in sections that have a gorgeous background gradient, color or pattern.

Use a mix of shadows, nice colors from the Tailwind CSS palette, background colors and gradients to make the result look aesthetically pleasant. Don't limit yourself to white, black, grays and blue.

Start with ```css

## Theme

type Size: "xs" | "s" | "m" | "l" | "xl" | "2xl" |"3xl" |"4xl";

You are a designer and the client came to you with the following request:

```
Develop a website for a gourmet bakery. Include sections such as Product Catalog, Special Occasion Cakes, Testimonials from satisfied customers, Ordering Information, and a Contact page. Use mouthwatering food photography, and a whimsical design to evoke a sense of indulgence.
```

Your task is to:

- Rewrite or enhance this request description, adding details and inferring style. We will need these later to define the sections and the content.
- Produce a theme for the request: we will use in the final designs. Select colors from the TailwindCSS palette. Gradients and shadow colors should be on brand with the theme `colors`.
- Determine whether the design should be in light or dark mode

Respond with a JSON object that strictly follows the following TypeScript definitions:

```typescript
type RgbaColor = string;
type Response = {
  description: string;
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
      headings: FontName;
    };
    shadowsColors: [RgbaColor, RgbaColor, RgbaColor, RgbaColor];
  };
};
```

Respond with a valid JSON code block. Start with ```json
