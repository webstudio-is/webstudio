import {
  $,
  css,
  expression,
  setInstanceMeta,
  setTemplateMeta,
  Parameter,
  PlaceholderValue,
  ws,
  type TemplateMeta,
} from "@webstudio-is/template";
import {
  CheckboxCheckedIcon,
  RadioCheckedIcon,
  Webstudio1cIcon,
} from "@webstudio-is/icons/svg";
import { createElement, type ReactNode } from "react";
import {
  blockComponent,
  collectionComponent,
  collectionDescription,
  descendantComponent,
  elementComponent,
} from "./core-metas";
import {
  contentBlockMdxTemplateDescriptors,
  getDefaultContentBlockTemplateName,
  type ContentBlockMdxTemplateDescriptor,
} from "./content-block";
import { contentBlockDocumentProp } from "./schema/content-block";

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

const BlockTemplate = ws["block-template"];
const BlockBody = ws["content-block-body"];
const { CodeText, HtmlEmbed } = $;
const blockDocument = new Parameter(contentBlockDocumentProp);

const listItemMdxTemplateDescriptor = contentBlockMdxTemplateDescriptors.find(
  ({ resolutionKey }) => resolutionKey === "element:li"
);
if (listItemMdxTemplateDescriptor?.kind !== "element") {
  throw new Error("Expected the Content Block list item template descriptor");
}

const createContentBlockMdxTemplate = (
  descriptor: ContentBlockMdxTemplateDescriptor
) => {
  if (descriptor.kind === "element") {
    const name = getDefaultContentBlockTemplateName({
      component: elementComponent,
      tag: descriptor.tag,
    });
    if (descriptor.tag === "ul" || descriptor.tag === "ol") {
      return setTemplateMeta(
        { name, label: descriptor.label },
        createElement(
          descriptor.tag,
          { key: descriptor.resolutionKey },
          createElement(listItemMdxTemplateDescriptor.tag)
        )
      );
    }
    return setTemplateMeta(
      { name, label: descriptor.label },
      createElement(descriptor.tag, { key: descriptor.resolutionKey })
    );
  }

  const Component = $[descriptor.component];
  const name = getDefaultContentBlockTemplateName({
    component: descriptor.component,
  });
  if (descriptor.component === "CodeText") {
    return setTemplateMeta(
      { name, label: descriptor.label },
      <Component key={descriptor.resolutionKey}>
        {'const status = "ready";'}
      </Component>
    );
  }
  return setTemplateMeta(
    { name, label: descriptor.label },
    <Component key={descriptor.resolutionKey} />
  );
};

const contentBlockDefaultTemplates = contentBlockMdxTemplateDescriptors.flatMap(
  (descriptor) => [
    ...(descriptor.resolutionKey === "component:CodeText"
      ? [
          setTemplateMeta(
            { name: "HtmlEmbed" },
            <HtmlEmbed key="custom:HtmlEmbed" />
          ),
        ]
      : []),
    createContentBlockMdxTemplate(descriptor),
  ]
);

const blockMeta: TemplateMeta = {
  category: "general",
  template: (
    <ws.block document={blockDocument}>
      {setInstanceMeta(
        { label: "Templates" },
        <BlockTemplate>{contentBlockDefaultTemplates}</BlockTemplate>
      )}
      <BlockBody>
        <p>
          The Content Block component designates regions on the page where
          pre-styled instances can be inserted in{" "}
          <a href="https://wstd.us/content-block">Content mode</a>.
        </p>
        <ul>
          <li>
            In Content mode, you can edit content inside this Content Block and
            add new instances predefined in templates. Content outside Content
            Blocks is read-only.
          </li>
          <li>
            To predefine instances for insertion in Content mode, switch to
            Design mode and add them to the Templates container.
          </li>
          <li>
            To insert predefined instances in Content mode, click the + button
            while hovering over the Content Block on the canvas and choose an
            instance from the list.
          </li>
        </ul>
      </BlockBody>
    </ws.block>
  ),
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

  code_text: {
    category: "typography",
    template: <CodeText>{'const status = "ready";'}</CodeText>,
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
    template: setInstanceMeta(
      { label: "Radio Field" },
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
    template: (
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

const builtWithWebstudioMeta: TemplateMeta = {
  category: "other",
  description:
    "A “Built with Webstudio” badge should be added to every project page on the free plan. This helps Webstudio spread awareness as a platform.",
  icon: Webstudio1cIcon,
  template: setInstanceMeta(
    { label: "Built with Webstudio" },
    <a
      // If you change this, you need to also update this link in publish checks
      href="https://webstudio.is/?via=badge"
      target="_blank"
      ws:style={css`
        display: inline-flex;
        gap: 6px;
        align-items: center;
        justify-content: center;
        position: fixed;
        z-index: 1000;
        padding: 6px 10px;
        right: 16px;
        bottom: 16px;
        color: rgba(251, 252, 253, 1);
        font-family: system-ui, sans-serif;
        font-size: 12px;
        font-weight: 500;
        line-height: 1;
        border: 1px solid transparent;
        border-radius: 9px;
        text-decoration-line: none;
        text-wrap-mode: nowrap;
        background-clip: padding-box, border-box;
        background-origin: padding-box, border-box;
        background-image:
          linear-gradient(135deg, #4a4efa 0%, #bd2fdb 66%, #ec59ce 100%),
          linear-gradient(
            135deg,
            #92fddc 0%,
            #7d7ffb 31.94%,
            #ed72fe 64.24%,
            #fdd791 100%
          );
      `}
    >
      {setInstanceMeta(
        { label: "Logo" },
        <HtmlEmbed
          code={Webstudio1cIcon}
          ws:style={css`
            display: block;
            width: 16px;
            height: 16px;
            flex-shrink: 0;
          `}
        />
      )}
      {setInstanceMeta({ label: "Text" }, <div>Built with Webstudio</div>)}
    </a>
  ),
};

export const coreTemplates = {
  [elementComponent]: elementMeta,
  link: linkMeta,
  [collectionComponent]: collectionMeta,
  [descendantComponent]: descendantMeta,
  [blockComponent]: blockMeta,
  ...typography,
  ...forms,
  builtWithWebstudio: builtWithWebstudioMeta,
};
