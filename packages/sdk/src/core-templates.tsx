import {
  $,
  css,
  expression,
  Parameter,
  ws,
  type TemplateMeta,
} from "@webstudio-is/template";
import {
  blockComponent,
  collectionComponent,
  descendantComponent,
  elementComponent,
} from "./core-metas";

const elementMeta: TemplateMeta = {
  category: "general",
  order: 0,
  description:
    "An HTML element is a core building block for web pages, structuring and displaying content like text, images, and links.",
  template: <ws.element></ws.element>,
};

const collectionItem = new Parameter("collectionItem");

const collectionMeta: TemplateMeta = {
  category: "data",
  order: 2,
  template: (
    <ws.collection
      data={["Collection Item 1", "Collection Item 2", "Collection Item 3"]}
      item={collectionItem}
    >
      <$.Box>
        <$.Text>{expression`${collectionItem}`}</$.Text>
      </$.Box>
    </ws.collection>
  ),
};

const descendantMeta: TemplateMeta = {
  category: "internal",
  template: <ws.descendant selector=" p" />,
};

const BlockTemplate = ws["block-template"];

const blockMeta: TemplateMeta = {
  category: "general",
  template: (
    <ws.block>
      <BlockTemplate ws:label="Templates">
        <$.Paragraph></$.Paragraph>
        <$.Heading ws:label="Heading 1" ws:tag="h1"></$.Heading>
        <$.Heading ws:label="Heading 2" ws:tag="h2"></$.Heading>
        <$.Heading ws:label="Heading 3" ws:tag="h3"></$.Heading>
        <$.Heading ws:label="Heading 4" ws:tag="h4"></$.Heading>
        <$.Heading ws:label="Heading 5" ws:tag="h5"></$.Heading>
        <$.Heading ws:label="Heading 6" ws:tag="h6"></$.Heading>
        <$.List ws:label="List (Unordered)">
          <$.ListItem></$.ListItem>
        </$.List>
        <$.List ws:label="List (Ordered)" ordered={true}>
          <$.ListItem></$.ListItem>
        </$.List>
        <$.Link></$.Link>
        <$.Image
          ws:style={css`
            margin-right: auto;
            margin-left: auto;
            width: 100%;
            height: auto;
          `}
        />
        <$.Separator />
        <$.Blockquote></$.Blockquote>
        <$.HtmlEmbed />
        <$.CodeText />
      </BlockTemplate>
      <$.Paragraph>
        The Content Block component designates regions on the page where
        pre-styled instances can be inserted in{" "}
        <$.RichTextLink href="https://wstd.us/content-block">
          Content mode
        </$.RichTextLink>
        .
      </$.Paragraph>
      <$.List>
        <$.ListItem>
          In Content mode, you can edit any direct child instances that were
          pre-added to the Content Block, as well as add new instances
          predefined in Templates.
        </$.ListItem>
        <$.ListItem>
          To predefine instances for insertion in Content mode, switch to Design
          mode and add them to the Templates container.
        </$.ListItem>
        <$.ListItem>
          To insert predefined instances in Content mode, click the + button
          while hovering over the Content Block on the canvas and choose an
          instance from the list.
        </$.ListItem>
      </$.List>
    </ws.block>
  ),
};

const typography: Record<string, TemplateMeta> = {
  heading: {
    category: "typography",
    order: 1,
    description:
      "Use HTML headings to structure and organize content. Use the Tag property in settings to change the heading level (h1-h6).",
    template: <ws.element ws:tag="h1"></ws.element>,
  },

  paragraph: {
    category: "typography",
    order: 2,
    description: "A container for multi-line text.",
    template: <ws.element ws:tag="p"></ws.element>,
  },

  blockquote: {
    category: "typography",
    order: 3,
    description:
      "Use to style a quote from an external source like an article or book.",
    template: (
      <ws.element
        ws:tag="blockquote"
        ws:style={css`
          margin-left: 0;
          margin-right: 0;
          padding: 10px 20px;
          border-left: 5px solid rgb(226 226 226 / 1);
        `}
      ></ws.element>
    ),
  },

  list: {
    category: "typography",
    order: 4,
    description: "Groups content, like links in a menu or steps in a recipe.",
    template: (
      <ws.element ws:tag="ul">
        <ws.element ws:tag="li"></ws.element>
        <ws.element ws:tag="li"></ws.element>
        <ws.element ws:tag="li"></ws.element>
      </ws.element>
    ),
  },

  list_item: {
    category: "typography",
    order: 5,
    description: "Adds a new item to an existing list.",
    template: <ws.element ws:tag="li"></ws.element>,
  },

  code_text: {
    category: "typography",
    order: 6,
    template: (
      <ws.element
        ws:tag="code"
        ws:style={css`
          display: block;
          white-space-collapse: preserve;
          text-wrap-mode: wrap;
          padding-left: 0.2em;
          padding-right: 0.2em;
          background-color: rgb(238 238 238);
        `}
      ></ws.element>
    ),
  },

  thematic_break: {
    category: "typography",
    order: 7,
    description:
      "Used to visually divide sections of content, helping to improve readability and organization within a webpage.",
    template: (
      <ws.element
        ws:tag="hr"
        ws:style={css`
          color: gray;
          border-style: none none solid;
        `}
      ></ws.element>
    ),
  },
};

export const coreTemplates = {
  [elementComponent]: elementMeta,
  [collectionComponent]: collectionMeta,
  [descendantComponent]: descendantMeta,
  [blockComponent]: blockMeta,
  ...typography,
};
