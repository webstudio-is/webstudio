import {
  $,
  css,
  expression,
  Parameter,
  PlaceholderValue,
  ws,
  type TemplateMeta,
} from "@webstudio-is/template";
import { CheckboxCheckedIcon, RadioCheckedIcon } from "@webstudio-is/icons/svg";
import {
  blockComponent,
  collectionComponent,
  descendantComponent,
  elementComponent,
} from "./core-metas";

const elementMeta: TemplateMeta = {
  category: "general",
  order: 1,
  description:
    "An HTML element is a core building block for web pages, structuring and displaying content like text, images, and links.",
  template: <ws.element></ws.element>,
};

const linkMeta: TemplateMeta = {
  category: "general",
  description:
    "Use a link to send your users to another page, section, or resource. Configure links in the Settings panel.",
  order: 2,
  template: (
    <ws.element
      ws:tag="a"
      ws:style={css`
        display: inline-block;
      `}
    ></ws.element>
  ),
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
      <ws.element ws:tag="div">
        <ws.element ws:tag="div">{expression`${collectionItem}`}</ws.element>
      </ws.element>
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
        <ws.element ws:tag="p"></ws.element>
        <ws.element ws:label="Heading 1" ws:tag="h1"></ws.element>
        <ws.element ws:label="Heading 2" ws:tag="h2"></ws.element>
        <ws.element ws:label="Heading 3" ws:tag="h3"></ws.element>
        <ws.element ws:label="Heading 4" ws:tag="h4"></ws.element>
        <ws.element ws:label="Heading 5" ws:tag="h5"></ws.element>
        <ws.element ws:label="Heading 6" ws:tag="h6"></ws.element>
        <ws.element ws:tag="ul">
          <ws.element ws:tag="li"></ws.element>
        </ws.element>
        <ws.element ws:tag="ol">
          <ws.element ws:tag="li"></ws.element>
        </ws.element>
        <ws.element ws:tag="a"></ws.element>
        <$.Image
          ws:style={css`
            margin-right: auto;
            margin-left: auto;
            width: 100%;
            height: auto;
          `}
        />
        <ws.element ws:tag="hr" />
        <ws.element ws:tag="blockquote"></ws.element>
        <$.HtmlEmbed />
        <ws.element ws:tag="code" />
      </BlockTemplate>
      <ws.element ws:tag="p">
        The Content Block component designates regions on the page where
        pre-styled instances can be inserted in{" "}
        <ws.element ws:tag="a" href="https://wstd.us/content-block">
          Content mode
        </ws.element>
        .
      </ws.element>
      <ws.element ws:tag="ul">
        <ws.element ws:tag="li">
          In Content mode, you can edit any direct child instances that were
          pre-added to the Content Block, as well as add new instances
          predefined in Templates.
        </ws.element>
        <ws.element ws:tag="li">
          To predefine instances for insertion in Content mode, switch to Design
          mode and add them to the Templates container.
        </ws.element>
        <ws.element ws:tag="li">
          To insert predefined instances in Content mode, click the + button
          while hovering over the Content Block on the canvas and choose an
          instance from the list.
        </ws.element>
      </ws.element>
    </ws.block>
  ),
};

const typography: Record<string, TemplateMeta> = {
  heading: {
    category: "typography",
    description:
      "Use HTML headings to structure and organize content. Use the Tag property in settings to change the heading level (h1-h6).",
    template: <ws.element ws:tag="h1"></ws.element>,
  },

  paragraph: {
    category: "typography",
    description: "A container for multi-line text.",
    template: <ws.element ws:tag="p"></ws.element>,
  },

  blockquote: {
    category: "typography",
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
    description: "Adds a new item to an existing list.",
    template: <ws.element ws:tag="li"></ws.element>,
  },

  code_text: {
    category: "typography",
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

const forms: Record<string, TemplateMeta> = {
  form: {
    category: "forms",
    description: "Create filters, surveys, searches and more.",
    template: (
      <ws.element ws:tag="form">
        <ws.element
          ws:tag="input"
          ws:style={css`
            display: block;
          `}
        />
        <ws.element ws:tag="button">
          {new PlaceholderValue("Submit")}
        </ws.element>
      </ws.element>
    ),
  },

  button: {
    category: "forms",
    description:
      "Use a button to submit forms or trigger actions within a page. Do not use a button to navigate users to another resource or another page - that’s what a link is used for.",
    template: (
      <ws.element ws:tag="button">{new PlaceholderValue("Button")}</ws.element>
    ),
  },

  input_label: {
    category: "forms",
    template: (
      <ws.element
        ws:tag="label"
        ws:style={css`
          display: block;
        `}
      >
        {new PlaceholderValue("Label")}
      </ws.element>
    ),
  },

  text_input: {
    category: "forms",
    description:
      "A single-line text input for collecting string data from your users.",
    template: (
      <ws.element
        ws:tag="input"
        ws:style={css`
          display: block;
        `}
      />
    ),
  },

  text_area: {
    category: "forms",
    description:
      "A multi-line text input for collecting longer string data from your users.",
    template: (
      <ws.element
        ws:tag="textarea"
        ws:style={css`
          display: block;
        `}
      />
    ),
  },

  select: {
    category: "forms",
    description:
      "A drop-down menu for users to select a single option from a predefined list.",
    template: (
      <ws.element
        ws:tag="select"
        ws:style={css`
          display: block;
        `}
      >
        <ws.element ws:tag="option" label="Please choose an option" value="" />
        <ws.element ws:tag="option" label="Option A" value="a" />
        <ws.element ws:tag="option" label="Option B" value="b" />
        <ws.element ws:tag="option" label="Option C" value="c" />
      </ws.element>
    ),
  },

  radio: {
    category: "forms",
    description:
      "Use within a form to allow your users to select a single option from a set of mutually exclusive choices. Group multiple radios by matching their “Name” properties.",
    icon: RadioCheckedIcon,
    template: (
      <ws.element
        ws:tag="label"
        ws:label="Radio Field"
        ws:style={css`
          display: block;
        `}
      >
        <ws.element
          ws:tag="input"
          ws:style={css`
            border-style: none;
            margin-right: 0.5em;
          `}
          type="radio"
        />
        <ws.element ws:tag="span" ws:label="Radio Label">
          {new PlaceholderValue("Radio")}
        </ws.element>
      </ws.element>
    ),
  },

  checkbox: {
    category: "forms",
    description:
      "Use within a form to allow your users to toggle between checked and not checked. Group checkboxes by matching their “Name” properties. Unlike radios, any number of checkboxes in a group can be checked.",
    icon: CheckboxCheckedIcon,
    template: (
      <ws.element
        ws:tag="label"
        ws:label="Checkbox Field"
        ws:style={css`
          display: block;
        `}
      >
        <ws.element
          ws:tag="input"
          ws:style={css`
            border-style: none;
            margin-right: 0.5em;
          `}
          type="checkbox"
        />
        <ws.element ws:tag="span" ws:label="Checkbox Label">
          {new PlaceholderValue("Checkbox")}
        </ws.element>
      </ws.element>
    ),
  },
};

export const coreTemplates = {
  [elementComponent]: elementMeta,
  link: linkMeta,
  [collectionComponent]: collectionMeta,
  [descendantComponent]: descendantMeta,
  [blockComponent]: blockMeta,
  ...typography,
  ...forms,
};
