import type { PropMeta } from "@webstudio-is/sdk";

export const props: Record<string, PropMeta> = {
  about: { required: false, control: "text", type: "string" },
  accept: {
    required: false,
    control: "text",
    type: "string",
    description: "List of types the server accepts, typically a file type.",
  },
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
  checked: {
    required: false,
    control: "boolean",
    type: "boolean",
    description:
      "Indicates whether the element should be checked on page load.",
  },
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
  disabled: {
    required: false,
    control: "boolean",
    type: "boolean",
    description: "Indicates whether the user can interact with the element.",
  },
  draggable: {
    required: false,
    control: "boolean",
    type: "boolean",
    description: "Defines whether the element can be dragged.",
  },
  enterKeyHint: {
    required: false,
    control: "select",
    type: "string",
    options: ["search", "enter", "done", "go", "next", "previous", "send"],
    description:
      "The enterkeyhint specifies what action label (or icon) to present for the enter key onvirtual keyboards. The attribute can be used with form controls (such asthe value of textarea elements), or in elements in anediting host (e.g., using contenteditable attribute).",
  },
  form: {
    required: false,
    control: "text",
    type: "string",
    description: "Indicates the form that is the owner of the element.",
  },
  formAction: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Indicates the action of the element, overriding the action defined inthe form.",
  },
  formEncType: {
    required: false,
    control: "text",
    type: "string",
    description:
      'If the button/input is a submit button (e.g. type="submit"), this attribute sets the encoding type to use during form submission. If this attribute is specified, it overrides theenctype attribute of the button\'s form owner.',
  },
  formMethod: {
    required: false,
    control: "text",
    type: "string",
    description:
      'If the button/input is a submit button (e.g. type="submit"), this attribute sets the submission method to use during form submission (GET, POST, etc.). If this attribute is specified, it overrides the method attribute of the button\'s form owner.',
  },
  formNoValidate: {
    required: false,
    control: "boolean",
    type: "boolean",
    description:
      'If the button/input is a submit button (e.g. type="submit"), this boolean attribute specifies that the form is not to be validatedwhen it is submitted. If this attribute is specified, it overrides thenovalidate attribute of the button\'s form owner.',
  },
  formTarget: {
    required: false,
    control: "text",
    type: "string",
    description:
      'If the button/input is a submit button (e.g. type="submit"), this attribute specifies the browsing context (for example, tab, window, or inline frame) in which to display the response that is received aftersubmitting the form. If this attribute is specified, it overrides thetarget attribute of the button\'s form owner.',
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
      "email",
      "tel",
      "url",
      "none",
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
  list: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Identifies a list of pre-defined options to suggest to the user.",
  },
  max: {
    required: false,
    control: "number",
    type: "number",
    description: "Indicates the maximum value allowed.",
  },
  maxLength: {
    required: false,
    control: "number",
    type: "number",
    description:
      "Defines the maximum number of characters allowed in the element.",
  },
  min: {
    required: false,
    control: "number",
    type: "number",
    description: "Indicates the minimum value allowed.",
  },
  minLength: {
    required: false,
    control: "number",
    type: "number",
    description:
      "Defines the minimum number of characters allowed in the element.",
  },
  multiple: {
    required: false,
    control: "boolean",
    type: "boolean",
    description:
      "Indicates whether multiple values can be entered in an input of the type email or file.",
  },
  name: {
    required: false,
    control: "text",
    type: "string",
    description:
      "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
  },
  nonce: { required: false, control: "text", type: "string" },
  pattern: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Defines a regular expression which the element's value will be validated against.",
  },
  placeholder: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Provides a hint to the user of what can be entered in the field.",
  },
  prefix: { required: false, control: "text", type: "string" },
  property: { required: false, control: "text", type: "string" },
  radioGroup: { required: false, control: "text", type: "string" },
  readOnly: {
    required: false,
    control: "boolean",
    type: "boolean",
    description: "Indicates whether the element can be edited.",
  },
  rel: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Specifies the relationship of the target object to the link object.",
  },
  required: {
    required: false,
    control: "boolean",
    type: "boolean",
    description:
      "Indicates whether this form element must be filled before the form can be submitted.",
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
  size: {
    required: false,
    control: "number",
    type: "number",
    description:
      "Defines the width of the element (in pixels). If the element'stype attribute is text or password then it's the number of characters.",
  },
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
  step: { required: false, control: "number", type: "number" },
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
  type: {
    required: false,
    control: "select",
    type: "string",
    defaultValue: "text",
    options: [
      "number",
      "search",
      "time",
      "text",
      "hidden",
      "color",
      "date",
      "datetime-local",
      "email",
      "month",
      "password",
      "range",
      "tel",
      "url",
      "week",
    ],
    description:
      "Specifies the type of data that this input will accept and helps the browser provide appropriate validation and formatting for that input type.",
  },
  typeof: { required: false, control: "text", type: "string" },
  unselectable: {
    required: false,
    control: "radio",
    type: "string",
    options: ["off", "on"],
  },
  value: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Defines a default value which will be displayed in the element on pageload.",
  },
  vocab: { required: false, control: "text", type: "string" },
  width: {
    required: false,
    control: "number",
    type: "number",
    description: "Defines the image’s width in pixels.",
  },
};
