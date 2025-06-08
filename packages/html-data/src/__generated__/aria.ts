type Attribute = {
  name: string;
  description: string;
  required?: boolean;
  type: "string" | "boolean" | "number" | "select" | "url";
  options?: string[];
};

export const ariaAttributes: Attribute[] = [
  {
    name: "role",
    description:
      "Defines an explicit role for an element for use by assistive technologies.",
    type: "string",
  },
  {
    name: "aria-activedescendant",
    description:
      "Identifies the currently active element when DOM focus is on a composite widget, combobox, textbox, group, or application.",
    type: "string",
  },
  {
    name: "aria-atomic",
    description:
      "Indicates whether assistive technologies will present all, or only parts of, the changed region based on the change notifications defined by the aria-relevant attribute.",
    type: "boolean",
  },
  {
    name: "aria-autocomplete",
    description:
      "Indicates whether inputting text could trigger display of one or more predictions of the user's intended value for a combobox, searchbox, or textbox and specifies how predictions would be presented if they were made.",
    type: "select",
    options: ["inline", "list", "both", "none"],
  },
  {
    name: "aria-braillelabel",
    description:
      "Defines a string value that labels the current element, which is intended to be converted into Braille. See related aria-label.",
    type: "string",
  },
  {
    name: "aria-brailleroledescription",
    description:
      "Defines a human-readable, author-localized abbreviated description for the role of an element, which is intended to be converted into Braille. See related aria-roledescription.",
    type: "string",
  },
  {
    name: "aria-busy",
    description:
      "Indicates an element is being modified and that assistive technologies could wait until the modifications are complete before exposing them to the user.",
    type: "boolean",
  },
  {
    name: "aria-checked",
    description:
      'Indicates the current "checked" state of checkboxes, radio buttons, and other widgets. See related aria-pressed and aria-selected.',
    type: "select",
    options: ["false", "mixed", "true"],
  },
  {
    name: "aria-colcount",
    description:
      "Defines the total number of columns in a table, grid, or treegrid. See related aria-colindex.",
    type: "number",
  },
  {
    name: "aria-colindex",
    description:
      "Defines an element's column index or position with respect to the total number of columns within a table, grid, or treegrid. See related aria-colindextext, aria-colcount, and aria-colspan.",
    type: "number",
  },
  {
    name: "aria-colspan",
    description:
      "Defines the number of columns spanned by a cell or gridcell within a table, grid, or treegrid. See related aria-colindex and aria-rowspan.",
    type: "number",
  },
  {
    name: "aria-controls",
    description:
      "Identifies the element (or elements) whose contents or presence are controlled by the current element. See related aria-owns.",
    type: "string",
  },
  {
    name: "aria-current",
    description:
      "Indicates the element that represents the current item within a container or set of related elements.",
    type: "select",
    options: ["page", "step", "location", "date", "time", "true", "false"],
  },
  {
    name: "aria-describedby",
    description:
      "Identifies the element (or elements) that describes the object. See related aria-labelledby and aria-description.",
    type: "string",
  },
  {
    name: "aria-description",
    description:
      "Defines a string value that describes or annotates the current element. See related aria-describedby.",
    type: "string",
  },
  {
    name: "aria-details",
    description:
      "Identifies the element (or elements) that provide additional information related to the object. See related aria-describedby.",
    type: "string",
  },
  {
    name: "aria-disabled",
    description:
      "Indicates that the element is perceivable but disabled, so it is not editable or otherwise operable. See related aria-hidden and aria-readonly.",
    type: "boolean",
  },
  {
    name: "aria-dropeffect",
    description:
      "[Deprecated in ARIA 1.1] Indicates what functions can be performed when a dragged object is released on the drop target.",
    type: "select",
    options: ["copy", "execute", "link", "move", "none", "popup"],
  },
  {
    name: "aria-errormessage",
    description:
      "Identifies the element (or elements) that provides an error message for an object. See related aria-invalid and aria-describedby.",
    type: "string",
  },
  {
    name: "aria-expanded",
    description:
      "Indicates whether a grouping element that is the accessibility child of or is controlled by this element is expanded or collapsed.",
    type: "boolean",
  },
  {
    name: "aria-flowto",
    description:
      "Identifies the next element (or elements) in an alternate reading order of content which, at the user's discretion, allows assistive technology to override the general default of reading in document source order.",
    type: "string",
  },
  {
    name: "aria-grabbed",
    description:
      '[Deprecated in ARIA 1.1] Indicates an element\'s "grabbed" state in a drag-and-drop operation.',
    type: "boolean",
  },
  {
    name: "aria-haspopup",
    description:
      "Indicates the availability and type of interactive popup element, such as menu or dialog, that can be triggered by an element.",
    type: "select",
    options: ["false", "true", "menu", "listbox", "tree", "grid", "dialog"],
  },
  {
    name: "aria-hidden",
    description:
      "Indicates whether the element is exposed to an accessibility API. See related aria-disabled.",
    type: "boolean",
  },
  {
    name: "aria-invalid",
    description:
      "Indicates the entered value does not conform to the format expected by the application. See related aria-errormessage.",
    type: "select",
    options: ["grammar", "false", "spelling", "true"],
  },
  {
    name: "aria-keyshortcuts",
    description:
      "Defines keyboard shortcuts that an author has implemented to activate or give focus to an element.",
    type: "string",
  },
  {
    name: "aria-label",
    description:
      "Provides the accessible name that describes an interactive element if no other accessible name exists, for example in a button that contains an image with no text.",
    type: "string",
  },
  {
    name: "aria-labelledby",
    description:
      "Identifies the element (or elements) that labels the current element. See related aria-label and aria-describedby.",
    type: "string",
  },
  {
    name: "aria-level",
    description:
      "Defines the hierarchical level of an element within a structure.",
    type: "number",
  },
  {
    name: "aria-live",
    description:
      "Indicates that an element will be updated, and describes the types of updates the user agents, assistive technologies, and user can expect from the live region.",
    type: "select",
    options: ["assertive", "off", "polite"],
  },
  {
    name: "aria-modal",
    description: "Indicates whether an element is modal when displayed.",
    type: "boolean",
  },
  {
    name: "aria-multiline",
    description:
      "Indicates whether a text box accepts multiple lines of input or only a single line.",
    type: "boolean",
  },
  {
    name: "aria-multiselectable",
    description:
      "Indicates that the user can select more than one item from the current selectable descendants.",
    type: "boolean",
  },
  {
    name: "aria-orientation",
    description:
      "Indicates whether the element's orientation is horizontal, vertical, or unknown/ambiguous.",
    type: "select",
    options: ["vertical", "undefined", "horizontal"],
  },
  {
    name: "aria-owns",
    description:
      "Identifies an element (or elements) in order to define a visual, functional, or contextual parent/child relationship between DOM elements where the DOM hierarchy cannot be used to represent the relationship. See related aria-controls.",
    type: "string",
  },
  {
    name: "aria-placeholder",
    description:
      "Defines a short hint (a word or short phrase) intended to aid the user with data entry when the control has no value. A hint could be a sample value or a brief description of the expected format.",
    type: "string",
  },
  {
    name: "aria-posinset",
    description:
      "Defines an element's number or position in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM. See related aria-setsize.",
    type: "number",
  },
  {
    name: "aria-pressed",
    description:
      'Indicates the current "pressed" state of toggle buttons. See related aria-checked and aria-selected.',
    type: "select",
    options: ["false", "mixed", "true"],
  },
  {
    name: "aria-readonly",
    description:
      " Indicates that the element is not editable, but is otherwise operable. See related aria-disabled.",
    type: "boolean",
  },
  {
    name: "aria-relevant",
    description:
      "Indicates what notifications the user agent will trigger when the accessibility tree within a live region is modified. See related aria-atomic.",
    type: "select",
    options: ["additions", "all", "removals", "text"],
  },
  {
    name: "aria-required",
    description:
      "Indicates that user input is required on the element before a form can be submitted.",
    type: "boolean",
  },
  {
    name: "aria-roledescription",
    description:
      "Defines a human-readable, author-localized description for the role of an element.",
    type: "string",
  },
  {
    name: "aria-rowcount",
    description:
      "Defines the total number of rows in a table, grid, or treegrid. See related aria-rowindex.",
    type: "number",
  },
  {
    name: "aria-rowindex",
    description:
      "Defines an element's row index or position with respect to the total number of rows within a table, grid, or treegrid. See related aria-rowindextext, aria-rowcount, and aria-rowspan.",
    type: "number",
  },
  {
    name: "aria-rowspan",
    description:
      "Defines the number of rows spanned by a cell or gridcell within a table, grid, or treegrid. See related aria-rowindex and aria-colspan.",
    type: "number",
  },
  {
    name: "aria-selected",
    description:
      'Indicates the current "selected" state of various widgets. See related aria-checked and aria-pressed.',
    type: "boolean",
  },
  {
    name: "aria-setsize",
    description:
      "Defines the number of items in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM. See related aria-posinset.",
    type: "number",
  },
  {
    name: "aria-sort",
    description:
      "Indicates if items in a table or grid are sorted in ascending or descending order.",
    type: "select",
    options: ["ascending", "descending", "none", "other"],
  },
  {
    name: "aria-valuemax",
    description: "Defines the maximum allowed value for a range widget.",
    type: "number",
  },
  {
    name: "aria-valuemin",
    description: "Defines the minimum allowed value for a range widget.",
    type: "number",
  },
  {
    name: "aria-valuenow",
    description:
      "Defines the current value for a range widget. See related aria-valuetext.",
    type: "number",
  },
  {
    name: "aria-valuetext",
    description:
      "Defines the human readable text alternative of aria-valuenow for a range widget.",
    type: "string",
  },
];
