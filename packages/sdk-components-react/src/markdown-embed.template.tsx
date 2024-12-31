import { type TemplateMeta, $, ws } from "@webstudio-is/template";
import { imagePlaceholderDataUrl } from "@webstudio-is/image";

const markdownSample = `
# Styling Markdown with Markdown Embed

Markdown Embed allows styling of Markdown, which primarily comes from external data.

## How to Use Markdown Embed

- Every element is shown in the Navigator.
- Apply styles and Tokens to each element.
- Adjustments to elements apply universally within this embed, ensuring consistency across your content.

---

## This sample text contains all the elements that can be styled.

Any elements that were not used above are used below.

### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

[Links](#) connect your content to relevant resources.

**Bold text** makes your important points stand out.

*Italic text* is great for emphasizing terms.

1. First Step
2. Second Step

![Image placeholder](${imagePlaceholderDataUrl})

> Capture attention with a powerful quote.

Using \`console.log("Hello World");\` will log to the console.

| Header 1   | Header 2   | Header 3   |
|------------|------------|------------|
| Cell 1.1   | Cell 1.2   | Cell 1.3   |
| Cell 2.1   | Cell 2.2   | Cell 2.3   |
| Cell 3.1   | Cell 3.2   | Cell 3.3   |
`.trim();

export const meta: TemplateMeta = {
  category: "data",
  description: "Used to add markdown code to the page",
  order: 4,
  template: (
    <$.MarkdownEmbed code={markdownSample}>
      <ws.descendant ws:label="Paragraph" selector=" p" />
      <ws.descendant ws:label="Heading 1" selector=" h1" />
      <ws.descendant ws:label="Heading 2" selector=" h2" />
      <ws.descendant ws:label="Heading 3" selector=" h3" />
      <ws.descendant ws:label="Heading 4" selector=" h4" />
      <ws.descendant ws:label="Heading 5" selector=" h5" />
      <ws.descendant ws:label="Heading 6" selector=" h6" />
      <ws.descendant ws:label="Bold" selector=" :where(strong, b)" />
      <ws.descendant ws:label="Italic" selector=" :where(em, i)" />
      <ws.descendant ws:label="Link" selector=" a" />
      <ws.descendant ws:label="Image" selector=" img" />
      <ws.descendant ws:label="Blockquote" selector=" blockquote" />
      <ws.descendant ws:label="Code Text" selector=" code" />
      <ws.descendant ws:label="List" selector=" :where(ul, ol)" />
      <ws.descendant ws:label="List Item" selector=" li" />
      <ws.descendant ws:label="Separator" selector=" hr" />
      <ws.descendant ws:label="Table" selector=" table" />
      <ws.descendant ws:label="Table Row" selector=" tr" />
      <ws.descendant ws:label="Table Header Cell" selector=" th" />
      <ws.descendant ws:label="Table Cell" selector=" td" />
    </$.MarkdownEmbed>
  ),
};
