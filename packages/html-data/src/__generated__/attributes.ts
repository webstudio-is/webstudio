type Attribute = {
  name: string;
  description: string;
  type: "string" | "boolean" | "number" | "select";
  options?: string[];
};

export const attributesByTag: Record<string, undefined | Attribute[]> = {
  "*": [
    {
      name: "accesskey",
      description: "Keyboard shortcut to activate or focus element",
      type: "string",
    },
    {
      name: "autocapitalize",
      description:
        "Recommended autocapitalization behavior (for supported input methods)",
      type: "select",
      options: ["on", "off", "none", "sentences", "words", "characters"],
    },
    {
      name: "autocorrect",
      description:
        "Recommended autocorrection behavior (for supported input methods)",
      type: "select",
      options: ["on", "off"],
    },
    {
      name: "autofocus",
      description: "Automatically focus the element when the page is loaded",
      type: "boolean",
    },
    {
      name: "class",
      description: "Classes to which the element belongs",
      type: "string",
    },
    {
      name: "contenteditable",
      description: "Whether the element is editable",
      type: "select",
      options: ["true", "plaintext-only", "false"],
    },
    {
      name: "dir",
      description: "The text directionality of the element",
      type: "select",
      options: ["ltr", "rtl", "auto"],
    },
    {
      name: "draggable",
      description: "Whether the element is draggable",
      type: "select",
      options: ["true", "false"],
    },
    {
      name: "hidden",
      description: "Whether the element is relevant",
      type: "boolean",
    },
    {
      name: "id",
      description: "The element's ID",
      type: "string",
    },
    {
      name: "inputmode",
      description: "Hint for selecting an input modality",
      type: "select",
      options: [
        "none",
        "text",
        "tel",
        "email",
        "url",
        "numeric",
        "decimal",
        "search",
      ],
    },
    {
      name: "is",
      description: "Creates a customized built-in element",
      type: "string",
    },
    {
      name: "itemid",
      description: "Global identifier for a microdata item",
      type: "string",
    },
    {
      name: "itemprop",
      description: "Property names of a microdata item",
      type: "string",
    },
    {
      name: "itemref",
      description: "Referenced elements",
      type: "string",
    },
    {
      name: "itemscope",
      description: "Introduces a microdata item",
      type: "boolean",
    },
    {
      name: "itemtype",
      description: "Item types of a microdata item",
      type: "string",
    },
    {
      name: "lang",
      description: "Language of the element",
      type: "string",
    },
    {
      name: "nonce",
      description:
        "Cryptographic nonce used in Content Security Policy checks [CSP]",
      type: "string",
    },
    {
      name: "slot",
      description: "The element's desired slot",
      type: "string",
    },
    {
      name: "spellcheck",
      description:
        "Whether the element is to have its spelling and grammar checked",
      type: "select",
      options: ["true", "false"],
    },
    {
      name: "tabindex",
      description:
        "Whether the element is focusable and sequentially focusable, and\n     the relative order of the element for the purposes of sequential focus navigation",
      type: "number",
    },
    {
      name: "title",
      description: "Advisory information for the element",
      type: "string",
    },
    {
      name: "translate",
      description:
        "Whether the element is to be translated when the page is localized",
      type: "select",
      options: ["yes", "no"],
    },
  ],
  a: [
    {
      name: "download",
      description:
        "Whether to download the resource instead of navigating to it, and its filename if so",
      type: "string",
    },
    {
      name: "href",
      description: "Address of the hyperlink",
      type: "string",
    },
    {
      name: "hreflang",
      description: "Language of the linked resource",
      type: "string",
    },
    {
      name: "ping",
      description: "URLs to ping",
      type: "string",
    },
    {
      name: "referrerpolicy",
      description: "Referrer policy for fetches initiated by the element",
      type: "string",
    },
    {
      name: "rel",
      description:
        "Relationship between the location in the document containing the hyperlink and the destination resource",
      type: "string",
    },
    {
      name: "target",
      description: "Navigable for hyperlink navigation",
      type: "string",
    },
    {
      name: "type",
      description: "Hint for the type of the referenced resource",
      type: "string",
    },
  ],
  abbr: [
    {
      name: "title",
      description: "Full term or expansion of abbreviation",
      type: "string",
    },
  ],
  area: [
    {
      name: "alt",
      description: "Replacement text for use when images are not available",
      type: "string",
    },
    {
      name: "coords",
      description: "Coordinates for the shape to be created in an image map",
      type: "string",
    },
    {
      name: "download",
      description:
        "Whether to download the resource instead of navigating to it, and its filename if so",
      type: "string",
    },
    {
      name: "href",
      description: "Address of the hyperlink",
      type: "string",
    },
    {
      name: "referrerpolicy",
      description: "Referrer policy for fetches initiated by the element",
      type: "string",
    },
    {
      name: "rel",
      description:
        "Relationship between the location in the document containing the hyperlink and the destination resource",
      type: "string",
    },
    {
      name: "shape",
      description: "The kind of shape to be created in an image map",
      type: "select",
      options: ["circle", "default", "poly", "rect"],
    },
    {
      name: "target",
      description: "Navigable for hyperlink navigation",
      type: "string",
    },
  ],
  audio: [
    {
      name: "autoplay",
      description:
        "Hint that the media resource can be started automatically when the page is loaded",
      type: "boolean",
    },
    {
      name: "controls",
      description: "Show user agent controls",
      type: "boolean",
    },
    {
      name: "crossorigin",
      description: "How the element handles crossorigin requests",
      type: "select",
      options: ["anonymous", "use-credentials"],
    },
    {
      name: "loop",
      description: "Whether to loop the media resource",
      type: "boolean",
    },
    {
      name: "muted",
      description: "Whether to mute the media resource by default",
      type: "boolean",
    },
    {
      name: "preload",
      description:
        "Hints how much buffering the media resource will likely need",
      type: "select",
      options: ["none", "metadata", "auto"],
    },
    {
      name: "src",
      description: "Address of the resource",
      type: "string",
    },
  ],
  base: [
    {
      name: "href",
      description: "Document base URL",
      type: "string",
    },
    {
      name: "target",
      description:
        "Default navigable for hyperlink navigation and form submission",
      type: "string",
    },
  ],
  bdo: [
    {
      name: "dir",
      description: "The text directionality of the element",
      type: "select",
      options: ["ltr", "rtl"],
    },
  ],
  blockquote: [
    {
      name: "cite",
      description:
        "Link to the source of the quotation or more information about the edit",
      type: "string",
    },
  ],
  button: [
    {
      name: "disabled",
      description: "Whether the form control is disabled",
      type: "boolean",
    },
    {
      name: "form",
      description: "Associates the element with a form element",
      type: "string",
    },
    {
      name: "formaction",
      description: "URL to use for form submission",
      type: "string",
    },
    {
      name: "formenctype",
      description: "Entry list encoding type to use for form submission",
      type: "select",
      options: [
        "application/x-www-form-urlencoded",
        "multipart/form-data",
        "text/plain",
      ],
    },
    {
      name: "formmethod",
      description: "Variant to use for form submission",
      type: "select",
      options: ["get", "post", "dialog"],
    },
    {
      name: "formnovalidate",
      description: "Bypass form control validation for form submission",
      type: "boolean",
    },
    {
      name: "formtarget",
      description: "Navigable for form submission",
      type: "string",
    },
    {
      name: "name",
      description:
        "Name of the element to use for form submission and in the form.elements API",
      type: "string",
    },
    {
      name: "type",
      description: "Type of button",
      type: "select",
      options: ["submit", "reset", "button"],
    },
    {
      name: "value",
      description: "Value to be used for form submission",
      type: "string",
    },
  ],
  canvas: [
    {
      name: "height",
      description: "Vertical dimension",
      type: "number",
    },
    {
      name: "width",
      description: "Horizontal dimension",
      type: "number",
    },
  ],
  col: [
    {
      name: "span",
      description: "Number of columns spanned by the element",
      type: "number",
    },
  ],
  colgroup: [
    {
      name: "span",
      description: "Number of columns spanned by the element",
      type: "number",
    },
  ],
  data: [
    {
      name: "value",
      description: "Machine-readable value",
      type: "string",
    },
  ],
  del: [
    {
      name: "cite",
      description:
        "Link to the source of the quotation or more information about the edit",
      type: "string",
    },
    {
      name: "datetime",
      description: "Date and (optionally) time of the change",
      type: "string",
    },
  ],
  details: [
    {
      name: "name",
      description: "Name of group of mutually-exclusive details elements",
      type: "string",
    },
    {
      name: "open",
      description: "Whether the details are visible",
      type: "boolean",
    },
  ],
  dfn: [
    {
      name: "title",
      description: "Full term or expansion of abbreviation",
      type: "string",
    },
  ],
  dialog: [
    {
      name: "open",
      description: "Whether the dialog box is showing",
      type: "boolean",
    },
  ],
  embed: [
    {
      name: "height",
      description: "Vertical dimension",
      type: "number",
    },
    {
      name: "src",
      description: "Address of the resource",
      type: "string",
    },
    {
      name: "type",
      description: "Type of embedded resource",
      type: "string",
    },
    {
      name: "width",
      description: "Horizontal dimension",
      type: "number",
    },
  ],
  fieldset: [
    {
      name: "disabled",
      description:
        "Whether the descendant form controls, except any inside legend, are disabled",
      type: "boolean",
    },
    {
      name: "form",
      description: "Associates the element with a form element",
      type: "string",
    },
    {
      name: "name",
      description:
        "Name of the element to use for form submission and in the form.elements API",
      type: "string",
    },
  ],
  form: [
    {
      name: "accept-charset",
      description: "Character encodings to use for form submission",
      type: "string",
    },
    {
      name: "action",
      description: "URL to use for form submission",
      type: "string",
    },
    {
      name: "autocomplete",
      description:
        "Default setting for autofill feature for controls in the form",
      type: "select",
      options: ["on", "off"],
    },
    {
      name: "enctype",
      description: "Entry list encoding type to use for form submission",
      type: "select",
      options: [
        "application/x-www-form-urlencoded",
        "multipart/form-data",
        "text/plain",
      ],
    },
    {
      name: "method",
      description: "Variant to use for form submission",
      type: "select",
      options: ["get", "post", "dialog"],
    },
    {
      name: "name",
      description: "Name of form to use in the document.forms API",
      type: "string",
    },
    {
      name: "novalidate",
      description: "Bypass form control validation for form submission",
      type: "boolean",
    },
    {
      name: "target",
      description: "Navigable for form submission",
      type: "string",
    },
  ],
  iframe: [
    {
      name: "allow",
      description: "Permissions policy to be applied to the iframe's contents",
      type: "string",
    },
    {
      name: "allowfullscreen",
      description:
        "Whether to allow the iframe's contents to use requestFullscreen()",
      type: "boolean",
    },
    {
      name: "height",
      description: "Vertical dimension",
      type: "number",
    },
    {
      name: "loading",
      description: "Used when determining loading deferral",
      type: "select",
      options: ["lazy", "eager"],
    },
    {
      name: "name",
      description: "Name of content navigable",
      type: "string",
    },
    {
      name: "referrerpolicy",
      description: "Referrer policy for fetches initiated by the element",
      type: "string",
    },
    {
      name: "sandbox",
      description: "Security rules for nested content",
      type: "string",
    },
    {
      name: "src",
      description: "Address of the resource",
      type: "string",
    },
    {
      name: "srcdoc",
      description: "A document to render in the iframe",
      type: "string",
    },
    {
      name: "width",
      description: "Horizontal dimension",
      type: "number",
    },
  ],
  img: [
    {
      name: "alt",
      description: "Replacement text for use when images are not available",
      type: "string",
    },
    {
      name: "crossorigin",
      description: "How the element handles crossorigin requests",
      type: "select",
      options: ["anonymous", "use-credentials"],
    },
    {
      name: "decoding",
      description:
        "Decoding hint to use when processing this image for presentation",
      type: "select",
      options: ["sync", "async", "auto"],
    },
    {
      name: "fetchpriority",
      description: "Sets the priority for fetches initiated by the element",
      type: "select",
      options: ["auto", "high", "low"],
    },
    {
      name: "height",
      description: "Vertical dimension",
      type: "number",
    },
    {
      name: "loading",
      description: "Used when determining loading deferral",
      type: "select",
      options: ["lazy", "eager"],
    },
    {
      name: "referrerpolicy",
      description: "Referrer policy for fetches initiated by the element",
      type: "string",
    },
    {
      name: "sizes",
      description: "Image sizes for different page layouts",
      type: "string",
    },
    {
      name: "src",
      description: "Address of the resource",
      type: "string",
    },
    {
      name: "srcset",
      description:
        "Images to use in different situations, e.g., high-resolution displays, small monitors, etc.",
      type: "string",
    },
    {
      name: "usemap",
      description: "Name of image map to use",
      type: "string",
    },
    {
      name: "width",
      description: "Horizontal dimension",
      type: "number",
    },
  ],
  input: [
    {
      name: "accept",
      description: "Hint for expected file type in file upload controls",
      type: "string",
    },
    {
      name: "alt",
      description: "Replacement text for use when images are not available",
      type: "string",
    },
    {
      name: "autocomplete",
      description: "Hint for form autofill feature",
      type: "string",
    },
    {
      name: "checked",
      description: "Whether the control is checked",
      type: "boolean",
    },
    {
      name: "disabled",
      description: "Whether the form control is disabled",
      type: "boolean",
    },
    {
      name: "form",
      description: "Associates the element with a form element",
      type: "string",
    },
    {
      name: "formaction",
      description: "URL to use for form submission",
      type: "string",
    },
    {
      name: "formenctype",
      description: "Entry list encoding type to use for form submission",
      type: "select",
      options: [
        "application/x-www-form-urlencoded",
        "multipart/form-data",
        "text/plain",
      ],
    },
    {
      name: "formmethod",
      description: "Variant to use for form submission",
      type: "select",
      options: ["get", "post", "dialog"],
    },
    {
      name: "formnovalidate",
      description: "Bypass form control validation for form submission",
      type: "boolean",
    },
    {
      name: "formtarget",
      description: "Navigable for form submission",
      type: "string",
    },
    {
      name: "height",
      description: "Vertical dimension",
      type: "number",
    },
    {
      name: "list",
      description: "List of autocomplete options",
      type: "string",
    },
    {
      name: "max",
      description: "Maximum value",
      type: "string",
    },
    {
      name: "maxlength",
      description: "Maximum length of value",
      type: "number",
    },
    {
      name: "min",
      description: "Minimum value",
      type: "string",
    },
    {
      name: "minlength",
      description: "Minimum length of value",
      type: "number",
    },
    {
      name: "multiple",
      description: "Whether to allow multiple values",
      type: "boolean",
    },
    {
      name: "name",
      description:
        "Name of the element to use for form submission and in the form.elements API",
      type: "string",
    },
    {
      name: "pattern",
      description: "Pattern to be matched by the form control's value",
      type: "string",
    },
    {
      name: "placeholder",
      description: "User-visible label to be placed within the form control",
      type: "string",
    },
    {
      name: "readonly",
      description: "Whether to allow the value to be edited by the user",
      type: "boolean",
    },
    {
      name: "required",
      description: "Whether the control is required for form submission",
      type: "boolean",
    },
    {
      name: "size",
      description: "Size of the control",
      type: "number",
    },
    {
      name: "src",
      description: "Address of the resource",
      type: "string",
    },
    {
      name: "step",
      description: "Granularity to be matched by the form control's value",
      type: "number",
    },
    {
      name: "title",
      description: "Description of pattern (when used with pattern attribute)",
      type: "string",
    },
    {
      name: "type",
      description: "Type of form control",
      type: "string",
    },
    {
      name: "value",
      description: "Value of the form control",
      type: "string",
    },
    {
      name: "width",
      description: "Horizontal dimension",
      type: "number",
    },
  ],
  ins: [
    {
      name: "cite",
      description:
        "Link to the source of the quotation or more information about the edit",
      type: "string",
    },
    {
      name: "datetime",
      description: "Date and (optionally) time of the change",
      type: "string",
    },
  ],
  label: [
    {
      name: "for",
      description: "Associate the label with form control",
      type: "string",
    },
  ],
  li: [
    {
      name: "value",
      description: "Ordinal value of the list item",
      type: "number",
    },
  ],
  map: [
    {
      name: "name",
      description: "Name of image map to reference from the usemap attribute",
      type: "string",
    },
  ],
  meta: [
    {
      name: "charset",
      description: "Character encoding declaration",
      type: "select",
      options: ["utf-8"],
    },
    {
      name: "content",
      description: "Value of the element",
      type: "string",
    },
    {
      name: "http-equiv",
      description: "Pragma directive",
      type: "select",
      options: [
        "content-type",
        "default-style",
        "refresh",
        "x-ua-compatible",
        "content-security-policy",
      ],
    },
    {
      name: "media",
      description: "Applicable media",
      type: "string",
    },
    {
      name: "name",
      description: "Metadata name",
      type: "string",
    },
  ],
  meter: [
    {
      name: "high",
      description: "Low limit of high range",
      type: "number",
    },
    {
      name: "low",
      description: "High limit of low range",
      type: "number",
    },
    {
      name: "max",
      description: "Upper bound of range",
      type: "number",
    },
    {
      name: "min",
      description: "Lower bound of range",
      type: "number",
    },
    {
      name: "optimum",
      description: "Optimum value in gauge",
      type: "number",
    },
    {
      name: "value",
      description: "Current value of the element",
      type: "number",
    },
  ],
  object: [
    {
      name: "data",
      description: "Address of the resource",
      type: "string",
    },
    {
      name: "form",
      description: "Associates the element with a form element",
      type: "string",
    },
    {
      name: "height",
      description: "Vertical dimension",
      type: "number",
    },
    {
      name: "name",
      description: "Name of content navigable",
      type: "string",
    },
    {
      name: "type",
      description: "Type of embedded resource",
      type: "string",
    },
    {
      name: "width",
      description: "Horizontal dimension",
      type: "number",
    },
  ],
  ol: [
    {
      name: "reversed",
      description: "Number the list backwards",
      type: "boolean",
    },
    {
      name: "start",
      description: "Starting value of the list",
      type: "number",
    },
    {
      name: "type",
      description: "Kind of list marker",
      type: "select",
      options: ["1", "a", "a", "i", "i"],
    },
  ],
  optgroup: [
    {
      name: "disabled",
      description: "Whether the form control is disabled",
      type: "boolean",
    },
    {
      name: "label",
      description: "User-visible label",
      type: "string",
    },
  ],
  option: [
    {
      name: "disabled",
      description: "Whether the form control is disabled",
      type: "boolean",
    },
    {
      name: "label",
      description: "User-visible label",
      type: "string",
    },
    {
      name: "selected",
      description: "Whether the option is selected by default",
      type: "boolean",
    },
    {
      name: "value",
      description: "Value to be used for form submission",
      type: "string",
    },
  ],
  output: [
    {
      name: "for",
      description: "Specifies controls from which the output was calculated",
      type: "string",
    },
    {
      name: "form",
      description: "Associates the element with a form element",
      type: "string",
    },
    {
      name: "name",
      description:
        "Name of the element to use for form submission and in the form.elements API",
      type: "string",
    },
  ],
  progress: [
    {
      name: "max",
      description: "Upper bound of range",
      type: "number",
    },
    {
      name: "value",
      description: "Current value of the element",
      type: "number",
    },
  ],
  q: [
    {
      name: "cite",
      description:
        "Link to the source of the quotation or more information about the edit",
      type: "string",
    },
  ],
  select: [
    {
      name: "autocomplete",
      description: "Hint for form autofill feature",
      type: "string",
    },
    {
      name: "disabled",
      description: "Whether the form control is disabled",
      type: "boolean",
    },
    {
      name: "form",
      description: "Associates the element with a form element",
      type: "string",
    },
    {
      name: "multiple",
      description: "Whether to allow multiple values",
      type: "boolean",
    },
    {
      name: "name",
      description:
        "Name of the element to use for form submission and in the form.elements API",
      type: "string",
    },
    {
      name: "required",
      description: "Whether the control is required for form submission",
      type: "boolean",
    },
    {
      name: "size",
      description: "Size of the control",
      type: "number",
    },
  ],
  slot: [
    {
      name: "name",
      description: "Name of shadow tree slot",
      type: "string",
    },
  ],
  source: [
    {
      name: "height",
      description: "Vertical dimension",
      type: "number",
    },
    {
      name: "media",
      description: "Applicable media",
      type: "string",
    },
    {
      name: "sizes",
      description: "Image sizes for different page layouts",
      type: "string",
    },
    {
      name: "src",
      description: "Address of the resource",
      type: "string",
    },
    {
      name: "srcset",
      description:
        "Images to use in different situations, e.g., high-resolution displays, small monitors, etc.",
      type: "string",
    },
    {
      name: "type",
      description: "Type of embedded resource",
      type: "string",
    },
    {
      name: "width",
      description: "Horizontal dimension",
      type: "number",
    },
  ],
  td: [
    {
      name: "colspan",
      description: "Number of columns that the cell is to span",
      type: "number",
    },
    {
      name: "headers",
      description: "The header cells for this cell",
      type: "string",
    },
    {
      name: "rowspan",
      description: "Number of rows that the cell is to span",
      type: "number",
    },
  ],
  textarea: [
    {
      name: "autocomplete",
      description: "Hint for form autofill feature",
      type: "string",
    },
    {
      name: "cols",
      description: "Maximum number of characters per line",
      type: "number",
    },
    {
      name: "dirname",
      description:
        "Name of form control to use for sending the element's directionality in form submission",
      type: "string",
    },
    {
      name: "disabled",
      description: "Whether the form control is disabled",
      type: "boolean",
    },
    {
      name: "form",
      description: "Associates the element with a form element",
      type: "string",
    },
    {
      name: "maxlength",
      description: "Maximum length of value",
      type: "number",
    },
    {
      name: "minlength",
      description: "Minimum length of value",
      type: "number",
    },
    {
      name: "name",
      description:
        "Name of the element to use for form submission and in the form.elements API",
      type: "string",
    },
    {
      name: "placeholder",
      description: "User-visible label to be placed within the form control",
      type: "string",
    },
    {
      name: "readonly",
      description: "Whether to allow the value to be edited by the user",
      type: "boolean",
    },
    {
      name: "required",
      description: "Whether the control is required for form submission",
      type: "boolean",
    },
    {
      name: "rows",
      description: "Number of lines to show",
      type: "number",
    },
    {
      name: "wrap",
      description:
        "How the value of the form control is to be wrapped for form submission",
      type: "select",
      options: ["soft", "hard"],
    },
  ],
  th: [
    {
      name: "abbr",
      description:
        "Alternative label to use for the header cell when referencing the cell in other contexts",
      type: "string",
    },
    {
      name: "colspan",
      description: "Number of columns that the cell is to span",
      type: "number",
    },
    {
      name: "headers",
      description: "The header cells for this cell",
      type: "string",
    },
    {
      name: "rowspan",
      description: "Number of rows that the cell is to span",
      type: "number",
    },
    {
      name: "scope",
      description: "Specifies which cells the header cell applies to",
      type: "select",
      options: ["row", "col", "rowgroup", "colgroup"],
    },
  ],
  time: [
    {
      name: "datetime",
      description: "Machine-readable value",
      type: "string",
    },
  ],
  track: [
    {
      name: "default",
      description: "Enable the track if no other text track is more suitable",
      type: "boolean",
    },
    {
      name: "kind",
      description: "The type of text track",
      type: "select",
      options: [
        "subtitles",
        "captions",
        "descriptions",
        "chapters",
        "metadata",
      ],
    },
    {
      name: "label",
      description: "User-visible label",
      type: "string",
    },
    {
      name: "src",
      description: "Address of the resource",
      type: "string",
    },
    {
      name: "srclang",
      description: "Language of the text track",
      type: "string",
    },
  ],
  video: [
    {
      name: "autoplay",
      description:
        "Hint that the media resource can be started automatically when the page is loaded",
      type: "boolean",
    },
    {
      name: "controls",
      description: "Show user agent controls",
      type: "boolean",
    },
    {
      name: "crossorigin",
      description: "How the element handles crossorigin requests",
      type: "select",
      options: ["anonymous", "use-credentials"],
    },
    {
      name: "height",
      description: "Vertical dimension",
      type: "number",
    },
    {
      name: "loop",
      description: "Whether to loop the media resource",
      type: "boolean",
    },
    {
      name: "muted",
      description: "Whether to mute the media resource by default",
      type: "boolean",
    },
    {
      name: "playsinline",
      description:
        "Encourage the user agent to display video content within the element's playback area",
      type: "boolean",
    },
    {
      name: "poster",
      description: "Poster frame to show prior to video playback",
      type: "string",
    },
    {
      name: "preload",
      description:
        "Hints how much buffering the media resource will likely need",
      type: "select",
      options: ["none", "metadata", "auto"],
    },
    {
      name: "src",
      description: "Address of the resource",
      type: "string",
    },
    {
      name: "width",
      description: "Horizontal dimension",
      type: "number",
    },
  ],
};
