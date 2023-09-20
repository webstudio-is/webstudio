import type { AttributesByTag } from "../types";
export const htmlAttributes: AttributesByTag = {
  th: [
    { name: "abbr", type: "string" },
    {
      name: "colspan",
      type: "number",
      description:
        "The colspan attribute defines the number of columns a cell should span.",
    },
    {
      name: "headers",
      type: "string",
      description: "IDs of the <th> elements which applies to this element.",
    },
    {
      name: "rowspan",
      type: "number",
      description: "Defines the number of rows a table cell should span over.",
    },
    {
      name: "scope",
      type: "enum",
      values: ["row", "col", "rowgroup", "colgroup"],
      description:
        "Defines the cells that the header test (defined in theth element) relates to.",
    },
  ],
  input: [
    {
      name: "accept",
      type: "string",
      description: "List of types the server accepts, typically a file type.",
    },
    {
      name: "alt",
      type: "string",
      description:
        "Text description of the image, which is very important for accessibility and search engine optimization. Screen readers read this description to users so they know what the image means. Alt text is also displayed on the page if the image can't be loaded for some reason.",
    },
    {
      name: "autocomplete",
      type: "string",
      description:
        "Indicates whether controls in this form can by default have their valuesautomatically completed by the browser.",
    },
    {
      name: "checked",
      type: "boolean",
      description:
        "Indicates whether the element should be checked on page load.",
    },
    { name: "dirname", type: "string" },
    {
      name: "disabled",
      type: "boolean",
      description: "Indicates whether the user can interact with the element.",
    },
    {
      name: "form",
      type: "string",
      description: "Indicates the form that is the owner of the element.",
    },
    {
      name: "formaction",
      type: "string",
      description:
        "Indicates the action of the element, overriding the action defined inthe form.",
    },
    {
      name: "formenctype",
      type: "enum",
      values: [
        "application/x-www-form-urlencoded",
        "multipart/form-data",
        "text/plain",
      ],
      description:
        'If the button/input is a submit button (e.g. type="submit"), this attribute sets the encoding type to use during form submission. If this attribute is specified, it overrides theenctype attribute of the button\'s form owner.',
    },
    {
      name: "formmethod",
      type: "enum",
      values: ["GET", "POST", "dialog"],
      description:
        'If the button/input is a submit button (e.g. type="submit"), this attribute sets the submission method to use during form submission (GET, POST, etc.). If this attribute is specified, it overrides the method attribute of the button\'s form owner.',
    },
    {
      name: "formnovalidate",
      type: "boolean",
      description:
        'If the button/input is a submit button (e.g. type="submit"), this boolean attribute specifies that the form is not to be validatedwhen it is submitted. If this attribute is specified, it overrides thenovalidate attribute of the button\'s form owner.',
    },
    {
      name: "formtarget",
      type: "string",
      description:
        'If the button/input is a submit button (e.g. type="submit"), this attribute specifies the browsing context (for example, tab, window, or inline frame) in which to display the response that is received aftersubmitting the form. If this attribute is specified, it overrides thetarget attribute of the button\'s form owner.',
    },
    {
      name: "height",
      type: "number",
      description: "Defines the image’s height in pixels.",
    },
    {
      name: "list",
      type: "string",
      description:
        "Identifies a list of pre-defined options to suggest to the user.",
    },
    {
      name: "max",
      type: "string",
      description: "Indicates the maximum value allowed.",
    },
    {
      name: "maxlength",
      type: "number",
      description:
        "Defines the maximum number of characters allowed in the element.",
    },
    {
      name: "min",
      type: "string",
      description: "Indicates the minimum value allowed.",
    },
    {
      name: "minlength",
      type: "number",
      description:
        "Defines the minimum number of characters allowed in the element.",
    },
    {
      name: "multiple",
      type: "boolean",
      description:
        "Indicates whether multiple values can be entered in an input of the type email or file.",
    },
    {
      name: "name",
      type: "string",
      description:
        "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
    },
    {
      name: "pattern",
      type: "string",
      description:
        "Defines a regular expression which the element's value will be validated against.",
    },
    {
      name: "placeholder",
      type: "string",
      description:
        "Provides a hint to the user of what can be entered in the field.",
    },
    { name: "popovertarget", type: "string" },
    {
      name: "popovertargetaction",
      type: "enum",
      values: ["toggle", "show", "hide"],
    },
    {
      name: "readonly",
      type: "boolean",
      description: "Indicates whether the element can be edited.",
    },
    {
      name: "required",
      type: "boolean",
      description:
        "Indicates whether this form element must be filled before the form can be submitted.",
    },
    {
      name: "size",
      type: "number",
      description:
        "Defines the width of the element (in pixels). If the element'stype attribute is text or password then it's the number of characters.",
    },
    {
      name: "src",
      type: "string",
      description: "The URL of the embeddable content.",
    },
    { name: "step", type: "number" },
    {
      name: "title",
      type: "string",
      description:
        "Text to be displayed in a tooltip when hovering over the element.",
    },
    {
      name: "type",
      type: "string",
      description: "Defines the type of the element.",
    },
    {
      name: "value",
      type: "string",
      description:
        "Defines a default value which will be displayed in the element on pageload.",
    },
    {
      name: "width",
      type: "number",
      description: "Defines the image’s width in pixels.",
    },
  ],
  form: [
    {
      name: "accept-charset",
      type: "string",
      description: "List of supported charsets.",
    },
    {
      name: "action",
      type: "string",
      description:
        "The URI of a program that processes the information submitted via the form.",
    },
    {
      name: "autocomplete",
      type: "enum",
      values: ["on", "off"],
      description:
        "Indicates whether controls in this form can by default have their valuesautomatically completed by the browser.",
    },
    {
      name: "enctype",
      type: "enum",
      values: [
        "application/x-www-form-urlencoded",
        "multipart/form-data",
        "text/plain",
      ],
      description:
        "Defines the content type of the form data when themethod is POST.",
    },
    {
      name: "method",
      type: "enum",
      values: ["GET", "POST", "dialog"],
      description:
        "Defines which HTTP method to use when submitting the form. Can be GET (default) or POST.",
    },
    {
      name: "name",
      type: "string",
      description:
        "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
    },
    {
      name: "novalidate",
      type: "boolean",
      description:
        "This attribute indicates that the form shouldn't be validated when submitted.",
    },
    {
      name: "target",
      type: "string",
      description:
        "Specifies where to open the linked document (in the case of an <a> element) or where to display the response received (in the case of a <form> element)",
    },
  ],
  "*": [
    {
      name: "accesskey",
      type: "string",
      description: "Keyboard shortcut to activate or add focus to the element.",
    },
    {
      name: "autocapitalize",
      type: "enum",
      values: ["on", "off", "none", "sentences", "words", "characters"],
      description:
        "Sets whether input is automatically capitalized when entered by user.",
    },
    {
      name: "autofocus",
      type: "boolean",
      description:
        "Indicates that an element should be focused on page load, or when its parent dialog is displayed.",
    },
    {
      name: "class",
      type: "string",
      description:
        "Often used with CSS to style elements with common properties.",
    },
    {
      name: "contenteditable",
      type: "enum",
      values: ["true", "plaintext-only", "false"],
      description: "Indicates whether the element's content is editable.",
    },
    {
      name: "dir",
      type: "enum",
      values: ["ltr", "rtl", "auto"],
      description:
        "Defines the text direction. Allowed values are ltr (Left-To-Right) or rtl (Right-To-Left)",
    },
    {
      name: "draggable",
      type: "enum",
      values: ["true", "false"],
      description: "Defines whether the element can be dragged.",
    },
    {
      name: "enterkeyhint",
      type: "enum",
      values: ["enter", "done", "go", "next", "previous", "search", "send"],
      description:
        "The enterkeyhint specifies what action label (or icon) to present for the enter key onvirtual keyboards. The attribute can be used with form controls (such asthe value of textarea elements), or in elements in anediting host (e.g., using contenteditable attribute).",
    },
    {
      name: "hidden",
      type: "enum",
      values: ["until-found", "hidden"],
      description:
        "Prevents rendering of given element, while keeping child elements, e.g. script elements, active.",
    },
    {
      name: "id",
      type: "string",
      description:
        "Often used with CSS to style a specific element. The value of this attribute must be unique.",
    },
    { name: "inert", type: "boolean" },
    {
      name: "inputmode",
      type: "enum",
      values: [
        "none",
        "text",
        "tel",
        "email",
        "url",
        "numeric",
        "decimal",
        "search",
      ],
      description:
        "Provides a hint as to the type of data that might be entered by the user while editing the element or its contents. The attribute can be used with form controls (such as the value oftextarea elements), or in elements in an editing host (e.g., using contenteditable attribute).",
    },
    { name: "is", type: "string" },
    { name: "itemid", type: "string" },
    { name: "itemprop", type: "string" },
    { name: "itemref", type: "string" },
    { name: "itemscope", type: "boolean" },
    { name: "itemtype", type: "string" },
    {
      name: "lang",
      type: "string",
      description: "Defines the language used in the element.",
    },
    { name: "nonce", type: "string" },
    { name: "popover", type: "enum", values: ["auto", "manual"] },
    {
      name: "slot",
      type: "string",
      description: "Assigns a slot in a shadow DOM shadow tree to an element.",
    },
    {
      name: "spellcheck",
      type: "enum",
      values: ["true", "false"],
      description:
        "Indicates whether spell checking is allowed for the element.",
    },
    {
      name: "style",
      type: "string",
      description:
        "Defines CSS styles which will override styles previously set.",
    },
    {
      name: "tabindex",
      type: "number",
      description:
        "Overrides the browser's default tab order and follows the one specified instead.",
    },
    {
      name: "title",
      type: "string",
      description:
        "Text to be displayed in a tooltip when hovering over the element.",
    },
    {
      name: "translate",
      type: "enum",
      values: ["yes", "no"],
      description:
        "Specify whether an element's attribute values and the values of its text node children are to be translated when the page is localized, or whether to leave them unchanged.",
    },
  ],
  iframe: [
    {
      name: "allow",
      type: "string",
      description: "Specifies a feature-policy for the iframe.",
    },
    { name: "allowfullscreen", type: "boolean" },
    {
      name: "height",
      type: "number",
      description: "Defines the image’s height in pixels.",
    },
    {
      name: "loading",
      type: "enum",
      values: ["lazy", "eager"],
      description:
        "Determines whether the image will load as soon as possible (Eager), or when it scrolls into view (Lazy). Lazy loading is a great option for pages with many images because it can significantly reduce the time it takes for the page to load initially.",
    },
    {
      name: "name",
      type: "string",
      description:
        "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
    },
    {
      name: "referrerpolicy",
      type: "string",
      description:
        "Specifies which referrer is sent when fetching the resource.",
    },
    {
      name: "sandbox",
      type: "string",
      description:
        "Stops a document loaded in an iframe from using certain features (such as submitting forms or opening new windows).",
    },
    {
      name: "src",
      type: "string",
      description: "The URL of the embeddable content.",
    },
    { name: "srcdoc", type: "string" },
    {
      name: "width",
      type: "number",
      description: "Defines the image’s width in pixels.",
    },
  ],
  area: [
    {
      name: "alt",
      type: "string",
      description:
        "Text description of the image, which is very important for accessibility and search engine optimization. Screen readers read this description to users so they know what the image means. Alt text is also displayed on the page if the image can't be loaded for some reason.",
    },
    {
      name: "coords",
      type: "number",
      description:
        "A set of values specifying the coordinates of the hot-spot region.",
    },
    {
      name: "download",
      type: "string",
      description:
        "Indicates that the hyperlink is to be used for downloading a resource.",
    },
    {
      name: "href",
      type: "string",
      description: "The URL of a linked resource.",
    },
    {
      name: "ping",
      type: "string",
      description:
        "The ping attribute specifies a space-separated list of URLs to be notified if a user follows the hyperlink.",
    },
    {
      name: "referrerpolicy",
      type: "string",
      description:
        "Specifies which referrer is sent when fetching the resource.",
    },
    {
      name: "rel",
      type: "string",
      description:
        "Specifies the relationship of the target object to the link object.",
    },
    {
      name: "shape",
      type: "enum",
      values: ["circle", "default", "poly", "rect"],
    },
    {
      name: "target",
      type: "string",
      description:
        "Specifies where to open the linked document (in the case of an <a> element) or where to display the response received (in the case of a <form> element)",
    },
  ],
  img: [
    {
      name: "alt",
      type: "string",
      description:
        "Text description of the image, which is very important for accessibility and search engine optimization. Screen readers read this description to users so they know what the image means. Alt text is also displayed on the page if the image can't be loaded for some reason.",
    },
    {
      name: "crossorigin",
      type: "enum",
      values: ["anonymous", "use-credentials"],
      description: "How the element handles cross-origin requests",
    },
    {
      name: "decoding",
      type: "enum",
      values: ["sync", "async", "auto"],
      description: "Indicates the preferred method to decode the image.",
    },
    { name: "fetchpriority", type: "enum", values: ["auto", "high", "low"] },
    {
      name: "height",
      type: "number",
      description: "Defines the image’s height in pixels.",
    },
    {
      name: "ismap",
      type: "boolean",
      description:
        "Indicates that the image is part of a server-side image map.",
    },
    {
      name: "loading",
      type: "enum",
      values: ["lazy", "eager"],
      description:
        "Determines whether the image will load as soon as possible (Eager), or when it scrolls into view (Lazy). Lazy loading is a great option for pages with many images because it can significantly reduce the time it takes for the page to load initially.",
    },
    {
      name: "referrerpolicy",
      type: "string",
      description:
        "Specifies which referrer is sent when fetching the resource.",
    },
    { name: "sizes", type: "string" },
    {
      name: "src",
      type: "string",
      description: "The URL of the embeddable content.",
    },
    {
      name: "srcset",
      type: "string",
      description: "One or more responsive image candidates.",
    },
    { name: "usemap", type: "string" },
    {
      name: "width",
      type: "number",
      description: "Defines the image’s width in pixels.",
    },
  ],
  link: [
    { name: "as", type: "enum", values: [] },
    { name: "blocking", type: "string" },
    {
      name: "color",
      type: "string",
      description:
        "This attribute sets the text color using either a named color or a  color specified in the hexadecimal #RRGGBB format. Note: This is a legacy attribute. Please use the CSS color property instead.",
    },
    {
      name: "crossorigin",
      type: "enum",
      values: ["anonymous", "use-credentials"],
      description: "How the element handles cross-origin requests",
    },
    {
      name: "disabled",
      type: "boolean",
      description: "Indicates whether the user can interact with the element.",
    },
    { name: "fetchpriority", type: "enum", values: ["auto", "high", "low"] },
    {
      name: "href",
      type: "string",
      description: "The URL of a linked resource.",
    },
    {
      name: "hreflang",
      type: "string",
      description: "Specifies the language of the linked resource.",
    },
    { name: "imagesizes", type: "string" },
    { name: "imagesrcset", type: "string" },
    {
      name: "integrity",
      type: "string",
      description:
        "Specifies a  Subresource Integrity  value that allows browsers to verify what they fetch.",
    },
    {
      name: "media",
      type: "string",
      description:
        "Specifies a hint of the media for which the linked resource was designed.",
    },
    {
      name: "referrerpolicy",
      type: "string",
      description:
        "Specifies which referrer is sent when fetching the resource.",
    },
    {
      name: "rel",
      type: "string",
      description:
        "Specifies the relationship of the target object to the link object.",
    },
    { name: "sizes", type: "string" },
    {
      name: "title",
      type: "string",
      description:
        "Text to be displayed in a tooltip when hovering over the element.",
    },
    {
      name: "title",
      type: "string",
      description:
        "Text to be displayed in a tooltip when hovering over the element.",
    },
    {
      name: "type",
      type: "string",
      description: "Defines the type of the element.",
    },
  ],
  script: [
    {
      name: "async",
      type: "boolean",
      description: "Executes the script asynchronously.",
    },
    { name: "blocking", type: "string" },
    {
      name: "crossorigin",
      type: "enum",
      values: ["anonymous", "use-credentials"],
      description: "How the element handles cross-origin requests",
    },
    {
      name: "defer",
      type: "boolean",
      description:
        "Indicates that the script should be executed after the page has beenparsed.",
    },
    { name: "fetchpriority", type: "enum", values: ["auto", "high", "low"] },
    {
      name: "integrity",
      type: "string",
      description:
        "Specifies a  Subresource Integrity  value that allows browsers to verify what they fetch.",
    },
    { name: "nomodule", type: "boolean" },
    {
      name: "referrerpolicy",
      type: "string",
      description:
        "Specifies which referrer is sent when fetching the resource.",
    },
    {
      name: "src",
      type: "string",
      description: "The URL of the embeddable content.",
    },
    {
      name: "type",
      type: "enum",
      values: ["module"],
      description: "Defines the type of the element.",
    },
  ],
  select: [
    {
      name: "autocomplete",
      type: "string",
      description:
        "Indicates whether controls in this form can by default have their valuesautomatically completed by the browser.",
    },
    {
      name: "disabled",
      type: "boolean",
      description: "Indicates whether the user can interact with the element.",
    },
    {
      name: "form",
      type: "string",
      description: "Indicates the form that is the owner of the element.",
    },
    {
      name: "multiple",
      type: "boolean",
      description:
        "Indicates whether multiple values can be entered in an input of the type email or file.",
    },
    {
      name: "name",
      type: "string",
      description:
        "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
    },
    {
      name: "required",
      type: "boolean",
      description:
        "Indicates whether this form element must be filled before the form can be submitted.",
    },
    {
      name: "size",
      type: "number",
      description:
        "Defines the width of the element (in pixels). If the element'stype attribute is text or password then it's the number of characters.",
    },
  ],
  textarea: [
    {
      name: "autocomplete",
      type: "string",
      description:
        "Indicates whether controls in this form can by default have their valuesautomatically completed by the browser.",
    },
    {
      name: "cols",
      type: "number",
      description: "Defines the number of columns in a textarea.",
    },
    { name: "dirname", type: "string" },
    {
      name: "disabled",
      type: "boolean",
      description: "Indicates whether the user can interact with the element.",
    },
    {
      name: "form",
      type: "string",
      description: "Indicates the form that is the owner of the element.",
    },
    {
      name: "maxlength",
      type: "number",
      description:
        "Defines the maximum number of characters allowed in the element.",
    },
    {
      name: "minlength",
      type: "number",
      description:
        "Defines the minimum number of characters allowed in the element.",
    },
    {
      name: "name",
      type: "string",
      description:
        "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
    },
    {
      name: "placeholder",
      type: "string",
      description:
        "Provides a hint to the user of what can be entered in the field.",
    },
    {
      name: "readonly",
      type: "boolean",
      description: "Indicates whether the element can be edited.",
    },
    {
      name: "required",
      type: "boolean",
      description:
        "Indicates whether this form element must be filled before the form can be submitted.",
    },
    {
      name: "rows",
      type: "number",
      description: "Defines the number of rows in a text area.",
    },
    {
      name: "wrap",
      type: "enum",
      values: ["soft", "hard"],
      description: "Indicates whether the text should be wrapped.",
    },
  ],
  audio: [
    {
      name: "autoplay",
      type: "boolean",
      description: "The audio or video should play as soon as possible.",
    },
    {
      name: "controls",
      type: "boolean",
      description:
        "Indicates whether the browser should show playback controls to the user.",
    },
    {
      name: "crossorigin",
      type: "enum",
      values: ["anonymous", "use-credentials"],
      description: "How the element handles cross-origin requests",
    },
    {
      name: "loop",
      type: "boolean",
      description:
        "Indicates whether the media should start playing from the start when it's finished.",
    },
    {
      name: "muted",
      type: "boolean",
      description:
        "Indicates whether the audio will be initially silenced on page load.",
    },
    {
      name: "preload",
      type: "enum",
      values: ["none", "metadata", "auto"],
      description:
        "Indicates whether the whole resource, parts of it or nothing should be preloaded.",
    },
    {
      name: "src",
      type: "string",
      description: "The URL of the embeddable content.",
    },
  ],
  video: [
    {
      name: "autoplay",
      type: "boolean",
      description: "The audio or video should play as soon as possible.",
    },
    {
      name: "controls",
      type: "boolean",
      description:
        "Indicates whether the browser should show playback controls to the user.",
    },
    {
      name: "crossorigin",
      type: "enum",
      values: ["anonymous", "use-credentials"],
      description: "How the element handles cross-origin requests",
    },
    {
      name: "height",
      type: "number",
      description: "Defines the image’s height in pixels.",
    },
    {
      name: "loop",
      type: "boolean",
      description:
        "Indicates whether the media should start playing from the start when it's finished.",
    },
    {
      name: "muted",
      type: "boolean",
      description:
        "Indicates whether the audio will be initially silenced on page load.",
    },
    {
      name: "playsinline",
      type: "boolean",
      description:
        'A Boolean attribute indicating that the video is to be played "inline"; that is, within the element\'s playback area. Note that the absence of this attribute does not imply that the video will always be played in fullscreen.',
    },
    {
      name: "poster",
      type: "string",
      description:
        "A URL indicating a poster frame to show until the user plays or seeks.",
    },
    {
      name: "preload",
      type: "enum",
      values: ["none", "metadata", "auto"],
      description:
        "Indicates whether the whole resource, parts of it or nothing should be preloaded.",
    },
    {
      name: "src",
      type: "string",
      description: "The URL of the embeddable content.",
    },
    {
      name: "width",
      type: "number",
      description: "Defines the image’s width in pixels.",
    },
  ],
  style: [
    { name: "blocking", type: "string" },
    {
      name: "media",
      type: "string",
      description:
        "Specifies a hint of the media for which the linked resource was designed.",
    },
    {
      name: "title",
      type: "string",
      description:
        "Text to be displayed in a tooltip when hovering over the element.",
    },
  ],
  meta: [
    {
      name: "charset",
      type: "string",
      description: "Declares the character encoding of the page or script.",
    },
    {
      name: "content",
      type: "string",
      description:
        "A value associated with http-equiv orname depending on the context.",
    },
    {
      name: "http-equiv",
      type: "enum",
      values: [
        "content-type",
        "default-style",
        "refresh",
        "x-ua-compatible",
        "content-security-policy",
      ],
      description: "Defines a pragma directive.",
    },
    {
      name: "media",
      type: "string",
      description:
        "Specifies a hint of the media for which the linked resource was designed.",
    },
    {
      name: "name",
      type: "string",
      description:
        "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
    },
  ],
  blockquote: [
    {
      name: "cite",
      type: "string",
      description:
        "Contains a URI which points to the source of the quote or change.",
    },
  ],
  del: [
    {
      name: "cite",
      type: "string",
      description:
        "Contains a URI which points to the source of the quote or change.",
    },
    {
      name: "datetime",
      type: "string",
      description: "Indicates the date and time associated with the element.",
    },
  ],
  ins: [
    {
      name: "cite",
      type: "string",
      description:
        "Contains a URI which points to the source of the quote or change.",
    },
    {
      name: "datetime",
      type: "string",
      description: "Indicates the date and time associated with the element.",
    },
  ],
  q: [
    {
      name: "cite",
      type: "string",
      description:
        "Contains a URI which points to the source of the quote or change.",
    },
  ],
  td: [
    {
      name: "colspan",
      type: "number",
      description:
        "The colspan attribute defines the number of columns a cell should span.",
    },
    {
      name: "headers",
      type: "string",
      description: "IDs of the <th> elements which applies to this element.",
    },
    {
      name: "rowspan",
      type: "number",
      description: "Defines the number of rows a table cell should span over.",
    },
  ],
  object: [
    {
      name: "data",
      type: "string",
      description: "Specifies the URL of the resource.",
    },
    {
      name: "form",
      type: "string",
      description: "Indicates the form that is the owner of the element.",
    },
    {
      name: "height",
      type: "number",
      description: "Defines the image’s height in pixels.",
    },
    {
      name: "name",
      type: "string",
      description:
        "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
    },
    {
      name: "type",
      type: "string",
      description: "Defines the type of the element.",
    },
    {
      name: "width",
      type: "number",
      description: "Defines the image’s width in pixels.",
    },
  ],
  time: [
    {
      name: "datetime",
      type: "number",
      description: "Indicates the date and time associated with the element.",
    },
  ],
  track: [
    {
      name: "default",
      type: "boolean",
      description:
        "Indicates that the track should be enabled unless the user's preferencesindicate something different.",
    },
    {
      name: "kind",
      type: "enum",
      values: ["subtitles", "captions", "descriptions", "chapters", "metadata"],
      description: "Specifies the kind of text track.",
    },
    {
      name: "label",
      type: "string",
      description: "Specifies a user-readable title of the element.",
    },
    {
      name: "src",
      type: "string",
      description: "The URL of the embeddable content.",
    },
    { name: "srclang", type: "string" },
  ],
  bdo: [
    {
      name: "dir",
      type: "enum",
      values: ["ltr", "rtl"],
      description:
        "Defines the text direction. Allowed values are ltr (Left-To-Right) or rtl (Right-To-Left)",
    },
  ],
  button: [
    {
      name: "disabled",
      type: "boolean",
      description: "Indicates whether the user can interact with the element.",
    },
    {
      name: "form",
      type: "string",
      description: "Indicates the form that is the owner of the element.",
    },
    {
      name: "formaction",
      type: "string",
      description:
        "Indicates the action of the element, overriding the action defined inthe form.",
    },
    {
      name: "formenctype",
      type: "enum",
      values: [
        "application/x-www-form-urlencoded",
        "multipart/form-data",
        "text/plain",
      ],
      description:
        'If the button/input is a submit button (e.g. type="submit"), this attribute sets the encoding type to use during form submission. If this attribute is specified, it overrides theenctype attribute of the button\'s form owner.',
    },
    {
      name: "formmethod",
      type: "enum",
      values: ["GET", "POST", "dialog"],
      description:
        'If the button/input is a submit button (e.g. type="submit"), this attribute sets the submission method to use during form submission (GET, POST, etc.). If this attribute is specified, it overrides the method attribute of the button\'s form owner.',
    },
    {
      name: "formnovalidate",
      type: "boolean",
      description:
        'If the button/input is a submit button (e.g. type="submit"), this boolean attribute specifies that the form is not to be validatedwhen it is submitted. If this attribute is specified, it overrides thenovalidate attribute of the button\'s form owner.',
    },
    {
      name: "formtarget",
      type: "string",
      description:
        'If the button/input is a submit button (e.g. type="submit"), this attribute specifies the browsing context (for example, tab, window, or inline frame) in which to display the response that is received aftersubmitting the form. If this attribute is specified, it overrides thetarget attribute of the button\'s form owner.',
    },
    {
      name: "name",
      type: "string",
      description:
        "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
    },
    { name: "popovertarget", type: "string" },
    {
      name: "popovertargetaction",
      type: "enum",
      values: ["toggle", "show", "hide"],
    },
    {
      name: "type",
      type: "enum",
      values: ["submit", "reset", "button"],
      description: "Defines the type of the element.",
    },
    {
      name: "value",
      type: "string",
      description:
        "Defines a default value which will be displayed in the element on pageload.",
    },
  ],
  optgroup: [
    {
      name: "disabled",
      type: "boolean",
      description: "Indicates whether the user can interact with the element.",
    },
    {
      name: "label",
      type: "string",
      description: "Specifies a user-readable title of the element.",
    },
  ],
  option: [
    {
      name: "disabled",
      type: "boolean",
      description: "Indicates whether the user can interact with the element.",
    },
    {
      name: "label",
      type: "string",
      description: "Specifies a user-readable title of the element.",
    },
    {
      name: "selected",
      type: "boolean",
      description: "Defines a value which will be selected on page load.",
    },
    {
      name: "value",
      type: "string",
      description:
        "Defines a default value which will be displayed in the element on pageload.",
    },
  ],
  fieldset: [
    {
      name: "disabled",
      type: "boolean",
      description: "Indicates whether the user can interact with the element.",
    },
    {
      name: "form",
      type: "string",
      description: "Indicates the form that is the owner of the element.",
    },
    {
      name: "name",
      type: "string",
      description:
        "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
    },
  ],
  a: [
    {
      name: "download",
      type: "string",
      description:
        "Indicates that the hyperlink is to be used for downloading a resource.",
    },
    {
      name: "href",
      type: "string",
      description: "The URL of a linked resource.",
    },
    {
      name: "hreflang",
      type: "string",
      description: "Specifies the language of the linked resource.",
    },
    {
      name: "ping",
      type: "string",
      description:
        "The ping attribute specifies a space-separated list of URLs to be notified if a user follows the hyperlink.",
    },
    {
      name: "referrerpolicy",
      type: "string",
      description:
        "Specifies which referrer is sent when fetching the resource.",
    },
    {
      name: "rel",
      type: "string",
      description:
        "Specifies the relationship of the target object to the link object.",
    },
    {
      name: "target",
      type: "string",
      description:
        "Specifies where to open the linked document (in the case of an <a> element) or where to display the response received (in the case of a <form> element)",
    },
    {
      name: "type",
      type: "string",
      description: "Defines the type of the element.",
    },
  ],
  label: [
    {
      name: "for",
      type: "string",
      description:
        "Associates this Label with an Input. The value of the “For” attribute should match the ID attribute of the corresponding Input element",
    },
  ],
  output: [
    {
      name: "for",
      type: "string",
      description:
        "Associates this Label with an Input. The value of the “For” attribute should match the ID attribute of the corresponding Input element",
    },
    {
      name: "form",
      type: "string",
      description: "Indicates the form that is the owner of the element.",
    },
    {
      name: "name",
      type: "string",
      description:
        "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
    },
  ],
  canvas: [
    {
      name: "height",
      type: "number",
      description: "Defines the image’s height in pixels.",
    },
    {
      name: "width",
      type: "number",
      description: "Defines the image’s width in pixels.",
    },
  ],
  embed: [
    {
      name: "height",
      type: "number",
      description: "Defines the image’s height in pixels.",
    },
    {
      name: "src",
      type: "string",
      description: "The URL of the embeddable content.",
    },
    {
      name: "type",
      type: "string",
      description: "Defines the type of the element.",
    },
    {
      name: "width",
      type: "number",
      description: "Defines the image’s width in pixels.",
    },
  ],
  source: [
    {
      name: "height",
      type: "number",
      description: "Defines the image’s height in pixels.",
    },
    {
      name: "media",
      type: "string",
      description:
        "Specifies a hint of the media for which the linked resource was designed.",
    },
    { name: "sizes", type: "string" },
    {
      name: "src",
      type: "string",
      description: "The URL of the embeddable content.",
    },
    {
      name: "srcset",
      type: "string",
      description: "One or more responsive image candidates.",
    },
    {
      name: "type",
      type: "string",
      description: "Defines the type of the element.",
    },
    {
      name: "width",
      type: "number",
      description: "Defines the image’s width in pixels.",
    },
  ],
  meter: [
    {
      name: "high",
      type: "number",
      description: "Indicates the lower bound of the upper range.",
    },
    {
      name: "low",
      type: "number",
      description: "Indicates the upper bound of the lower range.",
    },
    {
      name: "max",
      type: "number",
      description: "Indicates the maximum value allowed.",
    },
    {
      name: "min",
      type: "number",
      description: "Indicates the minimum value allowed.",
    },
    {
      name: "optimum",
      type: "number",
      description: "Indicates the optimal numeric value.",
    },
    {
      name: "value",
      type: "number",
      description:
        "Defines a default value which will be displayed in the element on pageload.",
    },
  ],
  base: [
    {
      name: "href",
      type: "string",
      description: "The URL of a linked resource.",
    },
    {
      name: "target",
      type: "string",
      description:
        "Specifies where to open the linked document (in the case of an <a> element) or where to display the response received (in the case of a <form> element)",
    },
  ],
  progress: [
    {
      name: "max",
      type: "number",
      description: "Indicates the maximum value allowed.",
    },
    {
      name: "value",
      type: "number",
      description:
        "Defines a default value which will be displayed in the element on pageload.",
    },
  ],
  map: [
    {
      name: "name",
      type: "string",
      description:
        "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
    },
  ],
  slot: [
    {
      name: "name",
      type: "string",
      description:
        "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
    },
  ],
  details: [
    {
      name: "open",
      type: "boolean",
      description:
        "Indicates whether the contents are currently visible (in the case of a <details> element) or whether the dialog is active and can be interacted with (in the case of a <dialog> element).",
    },
  ],
  dialog: [
    {
      name: "open",
      type: "boolean",
      description:
        "Indicates whether the contents are currently visible (in the case of a <details> element) or whether the dialog is active and can be interacted with (in the case of a <dialog> element).",
    },
  ],
  ol: [
    {
      name: "reversed",
      type: "boolean",
      description:
        "Indicates whether the list should be displayed in a descending order instead of an ascending order.",
    },
    {
      name: "start",
      type: "number",
      description: "Defines the first number if other than 1.",
    },
    {
      name: "type",
      type: "enum",
      values: ["1", "a", "A", "i", "I"],
      description: "Defines the type of the element.",
    },
  ],
  col: [{ name: "span", type: "number" }],
  colgroup: [{ name: "span", type: "number" }],
  abbr: [
    {
      name: "title",
      type: "string",
      description:
        "Text to be displayed in a tooltip when hovering over the element.",
    },
  ],
  dfn: [
    {
      name: "title",
      type: "string",
      description:
        "Text to be displayed in a tooltip when hovering over the element.",
    },
  ],
  data: [
    {
      name: "value",
      type: "string",
      description:
        "Defines a default value which will be displayed in the element on pageload.",
    },
  ],
  li: [
    {
      name: "value",
      type: "number",
      description:
        "Defines a default value which will be displayed in the element on pageload.",
    },
  ],
};
