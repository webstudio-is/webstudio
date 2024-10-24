import { MarkdownEmbedIcon } from "@webstudio-is/icons/svg";
import { imagePlaceholderDataUrl } from "@webstudio-is/image";
import {
  descendantComponent,
  type WsComponentMeta,
  type WsComponentPropsMeta,
  type WsEmbedTemplate,
} from "@webstudio-is/react-sdk";
import { props } from "./__generated__/markdown-embed.props";

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
`.trim();

const descendant = (label: string, tag: string): WsEmbedTemplate[number] => {
  return {
    type: "instance",
    component: descendantComponent,
    label,
    props: [{ type: "string", name: "selector", value: ` ${tag}` }],
    children: [],
  };
};

export const meta: WsComponentMeta = {
  category: "data",
  type: "embed",
  description: "Used to add markdown code to the page",
  icon: MarkdownEmbedIcon,
  presetStyle: {
    div: [
      {
        property: "display",
        value: { type: "keyword", value: "contents" },
      },
      {
        property: "whiteSpaceCollapse",
        value: { type: "keyword", value: "collapse" },
      },
    ],
  },
  order: 4,
  template: [
    {
      type: "instance",
      component: "MarkdownEmbed",
      props: [
        {
          name: "code",
          type: "string",
          value: markdownSample,
        },
      ],
      children: [
        descendant("Paragraph", "p"),
        descendant("Heading 1", "h1"),
        descendant("Heading 2", "h2"),
        descendant("Heading 3", "h3"),
        descendant("Heading 4", "h4"),
        descendant("Heading 5", "h5"),
        descendant("Heading 6", "h6"),
        descendant("Bold", ":where(strong, b)"),
        descendant("Italic", ":where(em, i)"),
        descendant("Link", "a"),
        descendant("Image", "img"),
        descendant("Blockquote", "blockquote"),
        descendant("Code Text", "code"),
        descendant("List", ":where(ul, ol)"),
        descendant("List Item", "li"),
        descendant("Separator", "hr"),
      ],
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props: {
    ...props,
    code: {
      required: true,
      control: "code",
      language: "markdown",
      type: "string",
    },
  },
  initialProps: ["className"],
};
