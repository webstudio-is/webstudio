import type { PropMeta } from "@webstudio-is/sdk";

export const props: Record<string, PropMeta> = {
  about: { required: false, control: "text", type: "string" },
  accessKey: {
    required: false,
    control: "text",
    type: "string",
    description: "Keyboard shortcut to activate or add focus to the element.",
  },
  autoCapitalize: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Sets whether input is automatically capitalized when entered by user.",
  },
  autoCorrect: { required: false, control: "text", type: "string" },
  autoFocus: {
    required: false,
    control: "boolean",
    type: "boolean",
    description:
      "Indicates that an element should be focused on page load, or when its parent dialog is displayed.",
  },
  autoSave: { required: false, control: "text", type: "string" },
  className: { required: false, control: "text", type: "string" },
  color: {
    required: false,
    control: "color",
    type: "string",
    description:
      "This attribute sets the text color using either a named color or a  color specified in the hexadecimal #RRGGBB format. Note: This is a legacy attribute. Please use the CSS color property instead.",
  },
  content: {
    required: false,
    control: "text",
    type: "string",
    description:
      "A value associated with http-equiv orname depending on the context.",
  },
  contextMenu: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Defines the ID of a menu element which willserve as the element's context menu.",
  },
  datatype: { required: false, control: "text", type: "string" },
  defaultChecked: { required: false, control: "boolean", type: "boolean" },
  defaultValue: { required: false, control: "text", type: "string" },
  dir: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Defines the text direction. Allowed values are ltr (Left-To-Right) or rtl (Right-To-Left)",
  },
  download: {
    required: false,
    control: "boolean",
    type: "boolean",
    description:
      "Indicates that the hyperlink is to be used for downloading a resource.",
  },
  draggable: {
    required: false,
    control: "boolean",
    type: "boolean",
    description: "Defines whether the element can be dragged.",
  },
  hidden: {
    required: false,
    control: "boolean",
    type: "boolean",
    description:
      "Prevents rendering of given element, while keeping child elements, e.g. script elements, active.",
  },
  href: {
    required: false,
    control: "text",
    type: "string",
    description: "The URL of a linked resource.",
  },
  hrefLang: {
    required: false,
    control: "text",
    type: "string",
    description: "Specifies the language of the linked resource.",
  },
  id: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Often used with CSS to style a specific element. The value of this attribute must be unique.",
  },
  inputMode: {
    description:
      "Hints at the type of data that might be entered by the user while editing the element or its contents",
    required: false,
    control: "select",
    type: "string",
    options: [
      "search",
      "text",
      "none",
      "tel",
      "url",
      "email",
      "numeric",
      "decimal",
    ],
  },
  is: {
    description:
      "Specify that a standard HTML element should behave like a defined custom built-in element",
    required: false,
    control: "text",
    type: "string",
  },
  itemID: { required: false, control: "text", type: "string" },
  itemProp: { required: false, control: "text", type: "string" },
  itemRef: { required: false, control: "text", type: "string" },
  itemScope: { required: false, control: "boolean", type: "boolean" },
  itemType: { required: false, control: "text", type: "string" },
  lang: {
    required: false,
    control: "text",
    type: "string",
    description: "Defines the language used in the element.",
  },
  media: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Specifies a hint of the media for which the linked resource was designed.",
  },
  nonce: { required: false, control: "text", type: "string" },
  ping: {
    required: false,
    control: "text",
    type: "string",
    description:
      "The ping attribute specifies a space-separated list of URLs to be notified if a user follows the hyperlink.",
  },
  prefetch: {
    required: false,
    control: "select",
    type: "string",
    options: ["none", "intent", "render", "viewport"],
    description:
      "Controls when and if the link prefetches the resources that the next page needs to make loading faster. “Intent” will prefetch when the link is hovered or focused. “Render” will prefetch when the link is rendered. “Viewport” will prefetch when the link is in the viewport. “None” will not prefetch.",
  },
  prefix: { required: false, control: "text", type: "string" },
  preventScrollReset: { required: false, control: "boolean", type: "boolean" },
  property: { required: false, control: "text", type: "string" },
  radioGroup: { required: false, control: "text", type: "string" },
  referrerPolicy: {
    required: false,
    control: "select",
    type: "string",
    options: [
      "",
      "no-referrer",
      "no-referrer-when-downgrade",
      "origin",
      "origin-when-cross-origin",
      "same-origin",
      "strict-origin",
      "strict-origin-when-cross-origin",
      "unsafe-url",
    ],
    description: "Specifies which referrer is sent when fetching the resource.",
  },
  rel: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Specifies the relationship of the target object to the link object.",
  },
  reloadDocument: { required: false, control: "boolean", type: "boolean" },
  replace: { required: false, control: "boolean", type: "boolean" },
  resource: { required: false, control: "text", type: "string" },
  results: { required: false, control: "number", type: "number" },
  rev: { required: false, control: "text", type: "string" },
  role: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Defines an explicit role for an element for use by assistive technologies.",
  },
  security: { required: false, control: "text", type: "string" },
  slot: {
    required: false,
    control: "text",
    type: "string",
    description: "Assigns a slot in a shadow DOM shadow tree to an element.",
  },
  spellCheck: {
    required: false,
    control: "boolean",
    type: "boolean",
    description: "Indicates whether spell checking is allowed for the element.",
  },
  suppressContentEditableWarning: {
    required: false,
    control: "boolean",
    type: "boolean",
  },
  suppressHydrationWarning: {
    required: false,
    control: "boolean",
    type: "boolean",
  },
  tabIndex: {
    required: false,
    control: "number",
    type: "number",
    description:
      "Overrides the browser's default tab order and follows the one specified instead.",
  },
  target: {
    required: false,
    control: "select",
    type: "string",
    options: ["_self", "_blank", "_parent", "_top"],
    description:
      "Specifies where to open the linked document (in the case of an <a> element) or where to display the response received (in the case of a <form> element)",
  },
  title: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Text to be displayed in a tooltip when hovering over the element.",
  },
  translate: {
    required: false,
    control: "radio",
    type: "string",
    options: ["yes", "no"],
    description:
      "Specify whether an element's attribute values and the values of its text node children are to be translated when the page is localized, or whether to leave them unchanged.",
  },
  type: {
    required: false,
    control: "text",
    type: "string",
    description: "Defines the type of the element.",
  },
  typeof: { required: false, control: "text", type: "string" },
  unselectable: {
    required: false,
    control: "radio",
    type: "string",
    options: ["on", "off"],
  },
  vocab: { required: false, control: "text", type: "string" },
};
