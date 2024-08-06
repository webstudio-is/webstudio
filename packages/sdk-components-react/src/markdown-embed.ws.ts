import { ContentEmbedIcon } from "@webstudio-is/icons/svg";
import {
  descendantComponent,
  type WsComponentMeta,
  type WsComponentPropsMeta,
  type WsEmbedTemplate,
} from "@webstudio-is/react-sdk";
import { props } from "./__generated__/markdown-embed.props";

const imagePlaceholder = `
<svg
  width="140"
  height="140"
  viewBox="0 0 600 600"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  >
  <rect width="600" height="600" fill="#CCCCCC" />
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M450 170H150C141.716 170 135 176.716 135 185V415C135 423.284 141.716 430 150 430H450C458.284 430 465 423.284 465 415V185C465 176.716 458.284 170 450 170ZM150 145C127.909 145 110 162.909 110 185V415C110 437.091 127.909 455 150 455H450C472.091 455 490 437.091 490 415V185C490 162.909 472.091 145 450 145H150Z"
    fill="#A2A2A2"
  />
  <path
    d="M237.135 235.012C237.135 255.723 220.345 272.512 199.635 272.512C178.924 272.512 162.135 255.723 162.135 235.012C162.135 214.301 178.924 197.512 199.635 197.512C220.345 197.512 237.135 214.301 237.135 235.012Z"
    fill="#A2A2A2"
  />
  <path
    d="M160 405V367.205L221.609 306.364L256.552 338.628L358.161 234L440 316.043V405H160Z"
    fill="#A2A2A2"
  />
</svg>
`.trim();

const markdownSample = `
# Styling HTML with Content Embed

Content Embed allows styling of HTML, which primarily comes from external data.

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

![Image placeholder](data:image/svg+xml;base64,${btoa(imagePlaceholder)})

> Capture attention with a powerful quote.

Using \`console.log("Hello World");\` will log to the console.
`.trimStart();

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
  label: "Markdown Embed",
  description: "Used to add markdown code to the page",
  icon: ContentEmbedIcon,
  presetStyle: {
    div: [
      {
        property: "display",
        value: { type: "keyword", value: "contents" },
      },
    ],
  },
  order: 8,
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
