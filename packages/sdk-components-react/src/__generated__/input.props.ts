import type { PropMeta } from "@webstudio-is/react-sdk";

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
  "aria-activedescendant": {
    description:
      "Identifies the currently active element when DOM focus is on a composite widget, textbox, group, or application.",
    required: false,
    control: "text",
    type: "string",
  },
  "aria-atomic": {
    description:
      "Indicates whether assistive technologies will present all, or only parts of, the changed region based on the change notifications defined by the aria-relevant attribute.",
    required: false,
    control: "boolean",
    type: "boolean",
  },
  "aria-autocomplete": {
    description:
      "Indicates whether inputting text could trigger display of one or more predictions of the user's intended value for an input and specifies how predictions would be\npresented if they are made.",
    required: false,
    control: "select",
    type: "string",
    options: ["list", "none", "inline", "both"],
  },
  "aria-braillelabel": {
    description:
      "Defines a string value that labels the current element, which is intended to be converted into Braille.\n@see aria-label.",
    required: false,
    control: "text",
    type: "string",
  },
  "aria-brailleroledescription": {
    description:
      "Defines a human-readable, author-localized abbreviated description for the role of an element, which is intended to be converted into Braille.\n@see aria-roledescription.",
    required: false,
    control: "text",
    type: "string",
  },
  "aria-busy": { required: false, control: "boolean", type: "boolean" },
  "aria-checked": {
    description:
      'Indicates the current "checked" state of checkboxes, radio buttons, and other widgets.\n@see aria-pressed\n@see aria-selected.',
    required: false,
    control: "text",
    type: "string",
  },
  "aria-colcount": {
    description:
      "Defines the total number of columns in a table, grid, or treegrid.\n@see aria-colindex.",
    required: false,
    control: "number",
    type: "number",
  },
  "aria-colindex": {
    description:
      "Defines an element's column index or position with respect to the total number of columns within a table, grid, or treegrid.\n@see aria-colcount\n@see aria-colspan.",
    required: false,
    control: "number",
    type: "number",
  },
  "aria-colindextext": {
    description:
      "Defines a human readable text alternative of aria-colindex.\n@see aria-rowindextext.",
    required: false,
    control: "text",
    type: "string",
  },
  "aria-colspan": {
    description:
      "Defines the number of columns spanned by a cell or gridcell within a table, grid, or treegrid.\n@see aria-colindex\n@see aria-rowspan.",
    required: false,
    control: "number",
    type: "number",
  },
  "aria-controls": {
    description:
      "Identifies the element (or elements) whose contents or presence are controlled by the current element.\n@see aria-owns.",
    required: false,
    control: "text",
    type: "string",
  },
  "aria-current": {
    description:
      "Indicates the element that represents the current item within a container or set of related elements.",
    required: false,
    control: "text",
    type: "string",
  },
  "aria-describedby": {
    description:
      "Identifies the element (or elements) that describes the object.\n@see aria-labelledby",
    required: false,
    control: "text",
    type: "string",
  },
  "aria-description": {
    description:
      "Defines a string value that describes or annotates the current element.\n@see related aria-describedby.",
    required: false,
    control: "text",
    type: "string",
  },
  "aria-details": {
    description:
      "Identifies the element that provides a detailed, extended description for the object.\n@see aria-describedby.",
    required: false,
    control: "text",
    type: "string",
  },
  "aria-disabled": {
    description:
      "Indicates that the element is perceivable but disabled, so it is not editable or otherwise operable.\n@see aria-hidden\n@see aria-readonly.",
    required: false,
    control: "boolean",
    type: "boolean",
  },
  "aria-dropeffect": {
    description:
      "Indicates what functions can be performed when a dragged object is released on the drop target.\n@deprecated in ARIA 1.1",
    required: false,
    control: "select",
    type: "string",
    options: ["link", "none", "copy", "execute", "move", "popup"],
  },
  "aria-errormessage": {
    description:
      "Identifies the element that provides an error message for the object.\n@see aria-invalid\n@see aria-describedby.",
    required: false,
    control: "text",
    type: "string",
  },
  "aria-expanded": {
    description:
      "Indicates whether the element, or another grouping element it controls, is currently expanded or collapsed.",
    required: false,
    control: "boolean",
    type: "boolean",
  },
  "aria-flowto": {
    description:
      "Identifies the next element (or elements) in an alternate reading order of content which, at the user's discretion,\nallows assistive technology to override the general default of reading in document source order.",
    required: false,
    control: "text",
    type: "string",
  },
  "aria-grabbed": {
    description:
      'Indicates an element\'s "grabbed" state in a drag-and-drop operation.\n@deprecated in ARIA 1.1',
    required: false,
    control: "boolean",
    type: "boolean",
  },
  "aria-haspopup": {
    description:
      "Indicates the availability and type of interactive popup element, such as menu or dialog, that can be triggered by an element.",
    required: false,
    control: "text",
    type: "string",
  },
  "aria-hidden": {
    description:
      "Indicates whether the element is exposed to an accessibility API.\n@see aria-disabled.",
    required: false,
    control: "boolean",
    type: "boolean",
  },
  "aria-invalid": {
    description:
      "Indicates the entered value does not conform to the format expected by the application.\n@see aria-errormessage.",
    required: false,
    control: "text",
    type: "string",
  },
  "aria-keyshortcuts": {
    description:
      "Indicates keyboard shortcuts that an author has implemented to activate or give focus to an element.",
    required: false,
    control: "text",
    type: "string",
  },
  "aria-label": {
    description:
      "Provides the accessible name that describes an interactive element if no other accessible name exists, for example in a button that contains an image with no text.",
    required: false,
    control: "text",
    type: "string",
  },
  "aria-labelledby": {
    description:
      "Identifies the element (or elements) that labels the current element.\n@see aria-describedby.",
    required: false,
    control: "text",
    type: "string",
  },
  "aria-level": {
    description:
      "Defines the hierarchical level of an element within a structure.",
    required: false,
    control: "number",
    type: "number",
  },
  "aria-live": {
    description:
      "Indicates that an element will be updated, and describes the types of updates the user agents, assistive technologies, and user can expect from the live region.",
    required: false,
    control: "radio",
    type: "string",
    options: ["off", "assertive", "polite"],
  },
  "aria-modal": {
    description: "Indicates whether an element is modal when displayed.",
    required: false,
    control: "boolean",
    type: "boolean",
  },
  "aria-multiline": {
    description:
      "Indicates whether a text box accepts multiple lines of input or only a single line.",
    required: false,
    control: "boolean",
    type: "boolean",
  },
  "aria-multiselectable": {
    description:
      "Indicates that the user may select more than one item from the current selectable descendants.",
    required: false,
    control: "boolean",
    type: "boolean",
  },
  "aria-orientation": {
    description:
      "Indicates whether the element's orientation is horizontal, vertical, or unknown/ambiguous.",
    required: false,
    control: "radio",
    type: "string",
    options: ["horizontal", "vertical"],
  },
  "aria-owns": {
    description:
      "Identifies an element (or elements) in order to define a visual, functional, or contextual parent/child relationship\nbetween DOM elements where the DOM hierarchy cannot be used to represent the relationship.\n@see aria-controls.",
    required: false,
    control: "text",
    type: "string",
  },
  "aria-placeholder": {
    description:
      "Defines a short hint (a word or short phrase) intended to aid the user with data entry when the control has no value.\nA hint could be a sample value or a brief description of the expected format.",
    required: false,
    control: "text",
    type: "string",
  },
  "aria-posinset": {
    description:
      "Defines an element's number or position in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM.\n@see aria-setsize.",
    required: false,
    control: "number",
    type: "number",
  },
  "aria-pressed": {
    description:
      'Indicates the current "pressed" state of toggle buttons.\n@see aria-checked\n@see aria-selected.',
    required: false,
    control: "text",
    type: "string",
  },
  "aria-readonly": {
    description:
      "Indicates that the element is not editable, but is otherwise operable.\n@see aria-disabled.",
    required: false,
    control: "boolean",
    type: "boolean",
  },
  "aria-relevant": {
    description:
      "Indicates what notifications the user agent will trigger when the accessibility tree within a live region is modified.\n@see aria-atomic.",
    required: false,
    control: "select",
    type: "string",
    options: [
      "text",
      "additions",
      "additions removals",
      "additions text",
      "all",
      "removals",
      "removals additions",
      "removals text",
      "text additions",
      "text removals",
    ],
  },
  "aria-required": {
    description:
      "Indicates that user input is required on the element before a form may be submitted.",
    required: false,
    control: "boolean",
    type: "boolean",
  },
  "aria-roledescription": {
    description:
      "Defines a human-readable, author-localized description for the role of an element.",
    required: false,
    control: "text",
    type: "string",
  },
  "aria-rowcount": {
    description:
      "Defines the total number of rows in a table, grid, or treegrid.\n@see aria-rowindex.",
    required: false,
    control: "number",
    type: "number",
  },
  "aria-rowindex": {
    description:
      "Defines an element's row index or position with respect to the total number of rows within a table, grid, or treegrid.\n@see aria-rowcount\n@see aria-rowspan.",
    required: false,
    control: "number",
    type: "number",
  },
  "aria-rowindextext": {
    description:
      "Defines a human readable text alternative of aria-rowindex.\n@see aria-colindextext.",
    required: false,
    control: "text",
    type: "string",
  },
  "aria-rowspan": {
    description:
      "Defines the number of rows spanned by a cell or gridcell within a table, grid, or treegrid.\n@see aria-rowindex\n@see aria-colspan.",
    required: false,
    control: "number",
    type: "number",
  },
  "aria-selected": {
    description:
      'Indicates the current "selected" state of various widgets.\n@see aria-checked\n@see aria-pressed.',
    required: false,
    control: "boolean",
    type: "boolean",
  },
  "aria-setsize": {
    description:
      "Defines the number of items in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM.\n@see aria-posinset.",
    required: false,
    control: "number",
    type: "number",
  },
  "aria-sort": {
    description:
      "Indicates if items in a table or grid are sorted in ascending or descending order.",
    required: false,
    control: "select",
    type: "string",
    options: ["none", "ascending", "descending", "other"],
  },
  "aria-valuemax": {
    description: "Defines the maximum allowed value for a range widget.",
    required: false,
    control: "number",
    type: "number",
  },
  "aria-valuemin": {
    description: "Defines the minimum allowed value for a range widget.",
    required: false,
    control: "number",
    type: "number",
  },
  "aria-valuenow": {
    description:
      "Defines the current value for a range widget.\n@see aria-valuetext.",
    required: false,
    control: "number",
    type: "number",
  },
  "aria-valuetext": {
    description:
      "Defines the human readable text alternative of aria-valuenow for a range widget.",
    required: false,
    control: "text",
    type: "string",
  },
  autoCapitalize: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Sets whether input is automatically capitalized when entered by user.",
  },
  autoComplete: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Indicates whether controls in this form can by default have their valuesautomatically completed by the browser.",
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
      "Hints at the type of data that might be entered by the user while editing the element or its contents\n@see https://html.spec.whatwg.org/multipage/interaction.html#input-modalities:-the-inputmode-attribute",
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
      "Specify that a standard HTML element should behave like a defined custom built-in element\n@see https://html.spec.whatwg.org/multipage/custom-elements.html#attr-is",
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
    options: ["on", "off"],
  },
  vocab: { required: false, control: "text", type: "string" },
  width: {
    required: false,
    control: "number",
    type: "number",
    description: "Defines the image’s width in pixels.",
  },
};
