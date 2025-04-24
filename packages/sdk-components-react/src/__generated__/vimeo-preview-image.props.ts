import type { PropMeta } from "@webstudio-is/sdk";

export const props: Record<string, PropMeta> = {
  about: { required: false, control: "text", type: "string" },
  accessKey: {
    required: false,
    control: "text",
    type: "string",
    description: "Keyboard shortcut to activate or add focus to the element.",
  },
  alt: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Text description of the image, which is very important for accessibility and search engine optimization. Screen readers read this description to users so they know what the image means. Alt text is also displayed on the page if the image can't be loaded for some reason.",
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
  crossOrigin: {
    required: false,
    control: "radio",
    type: "string",
    options: ["", "anonymous", "use-credentials"],
    description: "How the element handles cross-origin requests",
  },
  datatype: { required: false, control: "text", type: "string" },
  decoding: {
    required: false,
    control: "radio",
    type: "string",
    options: ["async", "auto", "sync"],
    description: "Indicates the preferred method to decode the image.",
  },
  defaultChecked: { required: false, control: "boolean", type: "boolean" },
  defaultValue: { required: false, control: "text", type: "string" },
  dir: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Defines the text direction. Allowed values are ltr (Left-To-Right) or rtl (Right-To-Left)",
  },
  draggable: {
    required: false,
    control: "boolean",
    type: "boolean",
    description: "Defines whether the element can be dragged.",
  },
  fetchPriority: {
    required: false,
    control: "radio",
    type: "string",
    options: ["high", "low", "auto"],
  },
  height: {
    required: false,
    control: "number",
    type: "number",
    description: "Defines the image’s height in pixels.",
  },
  hidden: {
    required: false,
    control: "boolean",
    type: "boolean",
    description:
      "Prevents rendering of given element, while keeping child elements, e.g. script elements, active.",
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
  loading: {
    required: false,
    control: "radio",
    type: "string",
    options: ["eager", "lazy"],
    description:
      "Determines whether the image will load as soon as possible (Eager), or when it scrolls into view (Lazy). Lazy loading is a great option for pages with many images because it can significantly reduce the time it takes for the page to load initially.",
  },
  nonce: { required: false, control: "text", type: "string" },
  optimize: {
    description: "Optimize the image for enhanced performance.",
    required: false,
    control: "boolean",
    type: "boolean",
  },
  prefix: { required: false, control: "text", type: "string" },
  property: { required: false, control: "text", type: "string" },
  quality: { required: false, control: "number", type: "number" },
  radioGroup: { required: false, control: "text", type: "string" },
  referrerPolicy: {
    required: false,
    control: "select",
    type: "string",
    options: [
      "",
      "origin",
      "no-referrer",
      "no-referrer-when-downgrade",
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
  sizes: { required: false, control: "text", type: "string" },
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
  src: {
    required: false,
    control: "text",
    type: "string",
    description: "The URL of the embeddable content.",
  },
  srcSet: {
    required: false,
    control: "text",
    type: "string",
    description: "One or more responsive image candidates.",
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
  typeof: { required: false, control: "text", type: "string" },
  unselectable: {
    required: false,
    control: "radio",
    type: "string",
    options: ["on", "off"],
  },
  useMap: { required: false, control: "text", type: "string" },
  vocab: { required: false, control: "text", type: "string" },
  width: {
    required: false,
    control: "number",
    type: "number",
    description: "Defines the image’s width in pixels.",
  },
};
