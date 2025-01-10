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
} from "./core-metas";

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
  category: "typography",
  template: (
    <ws.block>
      <BlockTemplate ws:label="Templates">
        <$.Paragraph></$.Paragraph>
        <$.Heading ws:label="Heading 1" tag="h1"></$.Heading>
        <$.Heading ws:label="Heading 2" tag="h2"></$.Heading>
        <$.Heading ws:label="Heading 3" tag="h3"></$.Heading>
        <$.Heading ws:label="Heading 4" tag="h4"></$.Heading>
        <$.Heading ws:label="Heading 5" tag="h5"></$.Heading>
        <$.Heading ws:label="Heading 6" tag="h6"></$.Heading>
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

export const coreTemplates = {
  [collectionComponent]: collectionMeta,
  [descendantComponent]: descendantMeta,
  [blockComponent]: blockMeta,
};
