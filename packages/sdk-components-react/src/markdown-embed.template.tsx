import {
  type TemplateMeta,
  $,
  setInstanceMeta,
  ws,
} from "@webstudio-is/template";
import { imagePlaceholderDataUrl } from "@webstudio-is/image";
const { MarkdownEmbed } = $;

const descendant = (label: string, selector: string) =>
  setInstanceMeta({ label }, <ws.descendant selector={selector} />);

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
    <MarkdownEmbed code={markdownSample}>
      {descendant("Paragraph", " p")}
      {descendant("Heading 1", " h1")}
      {descendant("Heading 2", " h2")}
      {descendant("Heading 3", " h3")}
      {descendant("Heading 4", " h4")}
      {descendant("Heading 5", " h5")}
      {descendant("Heading 6", " h6")}
      {descendant("Bold", " :where(strong, b)")}
      {descendant("Italic", " :where(em, i)")}
      {descendant("Link", " a")}
      {descendant("Image", " img")}
      {descendant("Blockquote", " blockquote")}
      {descendant("Code Text", " code")}
      {descendant("List", " :where(ul, ol)")}
      {descendant("List Item", " li")}
      {descendant("Separator", " hr")}
      {descendant("Table", " table")}
      {descendant("Table Row", " tr")}
      {descendant("Table Header Cell", " th")}
      {descendant("Table Cell", " td")}
    </MarkdownEmbed>
  ),
};
