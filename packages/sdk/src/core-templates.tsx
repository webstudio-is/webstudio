/** Defines templates made only from intrinsic HTML and compiler primitives. */
import {
  css,
  expression,
  setInstanceMeta,
  Parameter,
  PlaceholderValue,
  ws,
  type TemplateMeta,
} from "@webstudio-is/template";
import { CheckboxCheckedIcon, RadioCheckedIcon } from "@webstudio-is/icons/svg";
import type { ReactNode } from "react";
import {
  collectionComponent,
  collectionDescription,
  descendantComponent,
  elementComponent,
} from "./core-metas";

const elementMeta: TemplateMeta = {
  category: "general",
  order: 1,
  description:
    "An HTML element is a core building block for web pages, structuring and displaying content like text, images, and links.",
  template: <div />,
};

const linkMeta: TemplateMeta = {
  category: "general",
  description:
    "Use a link to send your users to another page, section, or resource. Configure links in the Settings panel.",
  order: 2,
  template: (
    <a
      ws:style={css`
        display: inline-block;
      `}
    />
  ),
};

const collectionItem = new Parameter("collectionItem");
const collectionItemKey = new Parameter("collectionItemKey");

const collectionMeta: TemplateMeta = {
  category: "data",
  order: 2,
  description: collectionDescription,
  template: (
    <ws.collection
      data={["Collection Item 1", "Collection Item 2", "Collection Item 3"]}
      item={collectionItem}
      itemKey={collectionItemKey}
    >
      <div>
        <div>{expression`${collectionItem}` as unknown as ReactNode}</div>
      </div>
    </ws.collection>
  ),
};

const descendantMeta: TemplateMeta = {
  category: "internal",
  template: <ws.descendant selector=" p" />,
};

const typography: Record<string, TemplateMeta> = {
  heading: {
    category: "typography",
    description:
      "Use HTML headings to structure and organize content. Use the Tag property in settings to change the heading level (h1-h6).",
    template: <h1 />,
  },

  paragraph: {
    category: "typography",
    description: "A container for multi-line text.",
    template: <p />,
  },

  blockquote: {
    category: "typography",
    description:
      "Use to style a quote from an external source like an article or book.",
    template: (
      <blockquote
        ws:style={css`
          margin-left: 0;
          margin-right: 0;
          padding: 10px 20px;
          border-left: 5px solid rgb(226 226 226 / 1);
        `}
      />
    ),
  },

  list: {
    category: "typography",
    description: "Groups content, like links in a menu or steps in a recipe.",
    template: (
      <ul>
        <li />
        <li />
        <li />
      </ul>
    ),
  },

  list_item: {
    category: "typography",
    description: "Adds a new item to an existing list.",
    template: <li />,
  },

  thematic_break: {
    category: "typography",
    description:
      "Used to visually divide sections of content, helping to improve readability and organization within a webpage.",
    template: (
      <hr
        ws:style={css`
          color: gray;
          border-style: none none solid;
        `}
      />
    ),
  },
};

const forms: Record<string, TemplateMeta> = {
  form: {
    category: "forms",
    description: "Create filters, surveys, searches and more.",
    template: (
      <form>
        <input
          ws:style={css`
            display: block;
          `}
        />
        <button>
          {new PlaceholderValue("Submit") as unknown as ReactNode}
        </button>
      </form>
    ),
  },

  button: {
    category: "forms",
    description:
      "Use a button to submit forms or trigger actions within a page. Do not use a button to navigate users to another resource or another page - that’s what a link is used for.",
    template: (
      <button>{new PlaceholderValue("Button") as unknown as ReactNode}</button>
    ),
  },

  input_label: {
    category: "forms",
    template: (
      <label
        ws:style={css`
          display: block;
        `}
      >
        {new PlaceholderValue("Label") as unknown as ReactNode}
      </label>
    ),
  },

  text_input: {
    category: "forms",
    description:
      "A single-line text input for collecting string data from your users.",
    template: (
      <input
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
      <textarea
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
      <select
        ws:style={css`
          display: block;
        `}
      >
        <option label="Please choose an option" value="" />
        <option label="Option A" value="a" />
        <option label="Option B" value="b" />
        <option label="Option C" value="c" />
      </select>
    ),
  },

  radio: {
    category: "forms",
    description:
      "Use within a form to allow your users to select a single option from a set of mutually exclusive choices. Group multiple radios by matching their “Name” properties.",
    icon: RadioCheckedIcon,
    template: setInstanceMeta(
      { label: "Radio Field" },
      <label
        ws:style={css`
          display: block;
        `}
      >
        <input
          ws:style={css`
            border-style: none;
            margin-right: 0.5em;
          `}
          type="radio"
        />
        {setInstanceMeta(
          { label: "Radio Label" },
          <span>{new PlaceholderValue("Radio") as unknown as ReactNode}</span>
        )}
      </label>
    ),
  },

  checkbox: {
    category: "forms",
    description:
      "Use within a form to allow your users to toggle between checked and not checked. Group checkboxes by matching their “Name” properties. Unlike radios, any number of checkboxes in a group can be checked.",
    icon: CheckboxCheckedIcon,
    template: setInstanceMeta(
      { label: "Checkbox Field" },
      <label
        ws:style={css`
          display: block;
        `}
      >
        <input
          ws:style={css`
            border-style: none;
            margin-right: 0.5em;
          `}
          type="checkbox"
        />
        {setInstanceMeta(
          { label: "Checkbox Label" },
          <span>
            {new PlaceholderValue("Checkbox") as unknown as ReactNode}
          </span>
        )}
      </label>
    ),
  },
};

export const intrinsicCoreTemplates = {
  [elementComponent]: elementMeta,
  link: linkMeta,
  [collectionComponent]: collectionMeta,
  [descendantComponent]: descendantMeta,
  ...typography,
  ...forms,
};
