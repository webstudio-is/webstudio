import type { PropMeta } from "@webstudio-is/sdk";

const globals: Record<string, PropMeta> = {
  accessKey: {
    type: "string",
    control: "text",
    required: false,
    description: "Keyboard shortcut to activate or add focus to the element.",
  },
  autoCapitalize: {
    type: "string",
    control: "select",
    required: false,
    options: ["on", "off", "none", "sentences", "words", "characters"],
    description:
      "Sets whether input is automatically capitalized when entered by user.",
  },
  autoFocus: {
    type: "boolean",
    control: "boolean",
    required: false,
    description:
      "Indicates that an element should be focused on page load, or when its parent dialog is displayed.",
  },
  className: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Often used with CSS to style elements with common properties.",
  },
  contentEditable: {
    type: "string",
    control: "radio",
    required: false,
    options: ["true", "plaintext-only", "false"],
    description: "Indicates whether the element's content is editable.",
  },
  dir: {
    type: "string",
    control: "radio",
    required: false,
    options: ["ltr", "rtl", "auto"],
    description:
      "Defines the text direction. Allowed values are ltr (Left-To-Right) or rtl (Right-To-Left)",
  },
  draggable: {
    type: "string",
    control: "radio",
    required: false,
    options: ["true", "false"],
    description: "Defines whether the element can be dragged.",
  },
  enterKeyHint: {
    type: "string",
    control: "select",
    required: false,
    options: ["enter", "done", "go", "next", "previous", "search", "send"],
    description:
      "The enterkeyhint specifies what action label (or icon) to present for the enter key onvirtual keyboards. The attribute can be used with form controls (such asthe value of textarea elements), or in elements in anediting host (e.g., using contenteditable attribute).",
  },
  hidden: {
    type: "string",
    control: "radio",
    required: false,
    options: ["until-found", "hidden"],
    description:
      "Prevents rendering of given element, while keeping child elements, e.g. script elements, active.",
  },
  id: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Often used with CSS to style a specific element. The value of this attribute must be unique.",
  },
  inert: { type: "boolean", control: "boolean", required: false },
  inputMode: {
    type: "string",
    control: "select",
    required: false,
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
    description:
      "Provides a hint as to the type of data that might be entered by the user while editing the element or its contents. The attribute can be used with form controls (such as the value oftextarea elements), or in elements in an editing host (e.g., using contenteditable attribute).",
  },
  is: { type: "string", control: "text", required: false },
  itemID: { type: "string", control: "text", required: false },
  itemProp: { type: "string", control: "text", required: false },
  itemRef: { type: "string", control: "text", required: false },
  itemScope: { type: "boolean", control: "boolean", required: false },
  itemType: { type: "string", control: "text", required: false },
  lang: {
    type: "string",
    control: "text",
    required: false,
    description: "Defines the language used in the element.",
  },
  nonce: { type: "string", control: "text", required: false },
  popover: {
    type: "string",
    control: "radio",
    required: false,
    options: ["auto", "manual"],
  },
  slot: {
    type: "string",
    control: "text",
    required: false,
    description: "Assigns a slot in a shadow DOM shadow tree to an element.",
  },
  spellCheck: {
    type: "string",
    control: "radio",
    required: false,
    options: ["true", "false"],
    description: "Indicates whether spell checking is allowed for the element.",
  },
  style: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Defines CSS styles which will override styles previously set.",
  },
  tabIndex: {
    type: "number",
    control: "number",
    required: false,
    description:
      "Overrides the browser's default tab order and follows the one specified instead.",
  },
  title: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Text to be displayed in a tooltip when hovering over the element.",
  },
  translate: {
    type: "string",
    control: "radio",
    required: false,
    options: ["yes", "no"],
    description:
      "Specify whether an element's attribute values and the values of its text node children are to be translated when the page is localized, or whether to leave them unchanged.",
  },
};

export const a = {
  ...globals,
  download: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Indicates that the hyperlink is to be used for downloading a resource.",
  },
  href: {
    type: "string",
    control: "text",
    required: false,
    description: "The URL of a linked resource.",
  },
  hrefLang: {
    type: "string",
    control: "text",
    required: false,
    description: "Specifies the language of the linked resource.",
  },
  ping: {
    type: "string",
    control: "text",
    required: false,
    description:
      "The ping attribute specifies a space-separated list of URLs to be notified if a user follows the hyperlink.",
  },
  referrerPolicy: {
    type: "string",
    control: "text",
    required: false,
    description: "Specifies which referrer is sent when fetching the resource.",
  },
  rel: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Specifies the relationship of the target object to the link object.",
  },
  target: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Specifies where to open the linked document (in the case of an <a> element) or where to display the response received (in the case of a <form> element)",
  },
  type: {
    type: "string",
    control: "text",
    required: false,
    description: "Defines the type of the element.",
  },
};

export const abbr = {
  ...globals,
  title: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Text to be displayed in a tooltip when hovering over the element.",
  },
};

export const address = globals;

export const area = {
  ...globals,
  alt: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Text description of the image, which is very important for accessibility and search engine optimization. Screen readers read this description to users so they know what the image means. Alt text is also displayed on the page if the image can't be loaded for some reason.",
  },
  coords: {
    type: "number",
    control: "number",
    required: false,
    description:
      "A set of values specifying the coordinates of the hot-spot region.",
  },
  download: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Indicates that the hyperlink is to be used for downloading a resource.",
  },
  href: {
    type: "string",
    control: "text",
    required: false,
    description: "The URL of a linked resource.",
  },
  ping: {
    type: "string",
    control: "text",
    required: false,
    description:
      "The ping attribute specifies a space-separated list of URLs to be notified if a user follows the hyperlink.",
  },
  referrerPolicy: {
    type: "string",
    control: "text",
    required: false,
    description: "Specifies which referrer is sent when fetching the resource.",
  },
  rel: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Specifies the relationship of the target object to the link object.",
  },
  shape: {
    type: "string",
    control: "select",
    required: false,
    options: ["circle", "default", "poly", "rect"],
  },
  target: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Specifies where to open the linked document (in the case of an <a> element) or where to display the response received (in the case of a <form> element)",
  },
};

export const article = globals;

export const aside = globals;

export const audio = {
  ...globals,
  autoPlay: {
    type: "boolean",
    control: "boolean",
    required: false,
    description: "The audio or video should play as soon as possible.",
  },
  controls: {
    type: "boolean",
    control: "boolean",
    required: false,
    description:
      "Indicates whether the browser should show playback controls to the user.",
  },
  crossOrigin: {
    type: "string",
    control: "radio",
    required: false,
    options: ["anonymous", "use-credentials"],
    description: "How the element handles cross-origin requests",
  },
  loop: {
    type: "boolean",
    control: "boolean",
    required: false,
    description:
      "Indicates whether the media should start playing from the start when it's finished.",
  },
  muted: {
    type: "boolean",
    control: "boolean",
    required: false,
    description:
      "Indicates whether the audio will be initially silenced on page load.",
  },
  preload: {
    type: "string",
    control: "radio",
    required: false,
    options: ["none", "metadata", "auto"],
    description:
      "Indicates whether the whole resource, parts of it or nothing should be preloaded.",
  },
  src: {
    type: "string",
    control: "text",
    required: false,
    description: "The URL of the embeddable content.",
  },
};

export const b = globals;

export const base = {
  ...globals,
  href: {
    type: "string",
    control: "text",
    required: false,
    description: "The URL of a linked resource.",
  },
  target: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Specifies where to open the linked document (in the case of an <a> element) or where to display the response received (in the case of a <form> element)",
  },
};

export const bdi = globals;

export const bdo = {
  ...globals,
  dir: {
    type: "string",
    control: "radio",
    required: false,
    options: ["ltr", "rtl"],
    description:
      "Defines the text direction. Allowed values are ltr (Left-To-Right) or rtl (Right-To-Left)",
  },
};

export const blockquote = {
  ...globals,
  cite: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Contains a URI which points to the source of the quote or change.",
  },
};

export const body = globals;

export const br = globals;

export const button = {
  ...globals,
  disabled: {
    type: "boolean",
    control: "boolean",
    required: false,
    description: "Indicates whether the user can interact with the element.",
  },
  form: {
    type: "string",
    control: "text",
    required: false,
    description: "Indicates the form that is the owner of the element.",
  },
  formAction: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Indicates the action of the element, overriding the action defined inthe form.",
  },
  formEncType: {
    type: "string",
    control: "radio",
    required: false,
    options: [
      "application/x-www-form-urlencoded",
      "multipart/form-data",
      "text/plain",
    ],
    description:
      'If the button/input is a submit button (e.g. type="submit"), this attribute sets the encoding type to use during form submission. If this attribute is specified, it overrides theenctype attribute of the button\'s form owner.',
  },
  formMethod: {
    type: "string",
    control: "radio",
    required: false,
    options: ["GET", "POST", "dialog"],
    description:
      'If the button/input is a submit button (e.g. type="submit"), this attribute sets the submission method to use during form submission (GET, POST, etc.). If this attribute is specified, it overrides the method attribute of the button\'s form owner.',
  },
  formNoValidate: {
    type: "boolean",
    control: "boolean",
    required: false,
    description:
      'If the button/input is a submit button (e.g. type="submit"), this boolean attribute specifies that the form is not to be validatedwhen it is submitted. If this attribute is specified, it overrides thenovalidate attribute of the button\'s form owner.',
  },
  formTarget: {
    type: "string",
    control: "text",
    required: false,
    description:
      'If the button/input is a submit button (e.g. type="submit"), this attribute specifies the browsing context (for example, tab, window, or inline frame) in which to display the response that is received aftersubmitting the form. If this attribute is specified, it overrides thetarget attribute of the button\'s form owner.',
  },
  name: {
    type: "string",
    control: "text",
    required: false,
    description:
      "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
  },
  popovertarget: { type: "string", control: "text", required: false },
  popovertargetaction: {
    type: "string",
    control: "radio",
    required: false,
    options: ["toggle", "show", "hide"],
  },
  type: {
    type: "string",
    control: "radio",
    required: false,
    options: ["submit", "reset", "button"],
    description: "Defines the type of the element.",
  },
  value: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Defines a default value which will be displayed in the element on pageload.",
  },
};

export const canvas = {
  ...globals,
  height: {
    type: "number",
    control: "number",
    required: false,
    description: "Defines the image’s height in pixels.",
  },
  width: {
    type: "number",
    control: "number",
    required: false,
    description: "Defines the image’s width in pixels.",
  },
};

export const caption = globals;

export const cite = globals;

export const code = globals;

export const col = {
  ...globals,
  span: { type: "number", control: "number", required: false },
};

export const colgroup = {
  ...globals,
  span: { type: "number", control: "number", required: false },
};

export const data = {
  ...globals,
  value: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Defines a default value which will be displayed in the element on pageload.",
  },
};

export const datalist = globals;

export const dd = globals;

export const del = {
  ...globals,
  cite: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Contains a URI which points to the source of the quote or change.",
  },
  dateTime: {
    type: "string",
    control: "text",
    required: false,
    description: "Indicates the date and time associated with the element.",
  },
};

export const details = {
  ...globals,
  open: {
    type: "boolean",
    control: "boolean",
    required: false,
    description:
      "Indicates whether the contents are currently visible (in the case of a <details> element) or whether the dialog is active and can be interacted with (in the case of a <dialog> element).",
  },
};

export const dfn = {
  ...globals,
  title: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Text to be displayed in a tooltip when hovering over the element.",
  },
};

export const dialog = {
  ...globals,
  open: {
    type: "boolean",
    control: "boolean",
    required: false,
    description:
      "Indicates whether the contents are currently visible (in the case of a <details> element) or whether the dialog is active and can be interacted with (in the case of a <dialog> element).",
  },
};

export const div = globals;

export const dl = globals;

export const dt = globals;

export const em = globals;

export const embed = {
  ...globals,
  height: {
    type: "number",
    control: "number",
    required: false,
    description: "Defines the image’s height in pixels.",
  },
  src: {
    type: "string",
    control: "text",
    required: false,
    description: "The URL of the embeddable content.",
  },
  type: {
    type: "string",
    control: "text",
    required: false,
    description: "Defines the type of the element.",
  },
  width: {
    type: "number",
    control: "number",
    required: false,
    description: "Defines the image’s width in pixels.",
  },
};

export const fieldset = {
  ...globals,
  disabled: {
    type: "boolean",
    control: "boolean",
    required: false,
    description: "Indicates whether the user can interact with the element.",
  },
  form: {
    type: "string",
    control: "text",
    required: false,
    description: "Indicates the form that is the owner of the element.",
  },
  name: {
    type: "string",
    control: "text",
    required: false,
    description:
      "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
  },
};

export const figcaption = globals;

export const figure = globals;

export const footer = globals;

export const form = {
  ...globals,
  acceptCharset: {
    type: "string",
    control: "text",
    required: false,
    description: "List of supported charsets.",
  },
  action: {
    type: "string",
    control: "text",
    required: false,
    description:
      "The URI of a program that processes the information submitted via the form.",
  },
  autoComplete: {
    type: "string",
    control: "radio",
    required: false,
    options: ["on", "off"],
    description:
      "Indicates whether controls in this form can by default have their valuesautomatically completed by the browser.",
  },
  encType: {
    type: "string",
    control: "radio",
    required: false,
    options: [
      "application/x-www-form-urlencoded",
      "multipart/form-data",
      "text/plain",
    ],
    description:
      "Defines the content type of the form data when themethod is POST.",
  },
  method: {
    type: "string",
    control: "radio",
    required: false,
    options: ["GET", "POST", "dialog"],
    description:
      "Defines which HTTP method to use when submitting the form. Can be GET (default) or POST.",
  },
  name: {
    type: "string",
    control: "text",
    required: false,
    description:
      "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
  },
  noValidate: {
    type: "boolean",
    control: "boolean",
    required: false,
    description:
      "This attribute indicates that the form shouldn't be validated when submitted.",
  },
  target: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Specifies where to open the linked document (in the case of an <a> element) or where to display the response received (in the case of a <form> element)",
  },
};

export const h1 = globals;

export const h2 = globals;

export const h3 = globals;

export const h4 = globals;

export const h5 = globals;

export const h6 = globals;

export const head = globals;

export const header = globals;

export const hgroup = globals;

export const hr = globals;

export const html = globals;

export const i = globals;

export const iframe = {
  ...globals,
  allow: {
    type: "string",
    control: "text",
    required: false,
    description: "Specifies a feature-policy for the iframe.",
  },
  allowFullScreen: { type: "boolean", control: "boolean", required: false },
  height: {
    type: "number",
    control: "number",
    required: false,
    description: "Defines the image’s height in pixels.",
  },
  loading: {
    type: "string",
    control: "radio",
    required: false,
    options: ["lazy", "eager"],
    description:
      "Determines whether the image will load as soon as possible (Eager), or when it scrolls into view (Lazy). Lazy loading is a great option for pages with many images because it can significantly reduce the time it takes for the page to load initially.",
  },
  name: {
    type: "string",
    control: "text",
    required: false,
    description:
      "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
  },
  referrerPolicy: {
    type: "string",
    control: "text",
    required: false,
    description: "Specifies which referrer is sent when fetching the resource.",
  },
  sandbox: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Stops a document loaded in an iframe from using certain features (such as submitting forms or opening new windows).",
  },
  src: {
    type: "string",
    control: "text",
    required: false,
    description: "The URL of the embeddable content.",
  },
  srcDoc: { type: "string", control: "text", required: false },
  width: {
    type: "number",
    control: "number",
    required: false,
    description: "Defines the image’s width in pixels.",
  },
};

export const img = {
  ...globals,
  alt: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Text description of the image, which is very important for accessibility and search engine optimization. Screen readers read this description to users so they know what the image means. Alt text is also displayed on the page if the image can't be loaded for some reason.",
  },
  crossOrigin: {
    type: "string",
    control: "radio",
    required: false,
    options: ["anonymous", "use-credentials"],
    description: "How the element handles cross-origin requests",
  },
  decoding: {
    type: "string",
    control: "radio",
    required: false,
    options: ["sync", "async", "auto"],
    description: "Indicates the preferred method to decode the image.",
  },
  fetchPriority: {
    type: "string",
    control: "radio",
    required: false,
    options: ["auto", "high", "low"],
  },
  height: {
    type: "number",
    control: "number",
    required: false,
    description: "Defines the image’s height in pixels.",
  },
  ismap: {
    type: "boolean",
    control: "boolean",
    required: false,
    description: "Indicates that the image is part of a server-side image map.",
  },
  loading: {
    type: "string",
    control: "radio",
    required: false,
    options: ["lazy", "eager"],
    description:
      "Determines whether the image will load as soon as possible (Eager), or when it scrolls into view (Lazy). Lazy loading is a great option for pages with many images because it can significantly reduce the time it takes for the page to load initially.",
  },
  referrerPolicy: {
    type: "string",
    control: "text",
    required: false,
    description: "Specifies which referrer is sent when fetching the resource.",
  },
  sizes: { type: "string", control: "text", required: false },
  src: {
    type: "string",
    control: "text",
    required: false,
    description: "The URL of the embeddable content.",
  },
  srcSet: {
    type: "string",
    control: "text",
    required: false,
    description: "One or more responsive image candidates.",
  },
  useMap: { type: "string", control: "text", required: false },
  width: {
    type: "number",
    control: "number",
    required: false,
    description: "Defines the image’s width in pixels.",
  },
};

export const input = {
  ...globals,
  accept: {
    type: "string",
    control: "text",
    required: false,
    description: "List of types the server accepts, typically a file type.",
  },
  alt: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Text description of the image, which is very important for accessibility and search engine optimization. Screen readers read this description to users so they know what the image means. Alt text is also displayed on the page if the image can't be loaded for some reason.",
  },
  autoComplete: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Indicates whether controls in this form can by default have their valuesautomatically completed by the browser.",
  },
  checked: {
    type: "boolean",
    control: "boolean",
    required: false,
    description:
      "Indicates whether the element should be checked on page load.",
  },
  dirname: { type: "string", control: "text", required: false },
  disabled: {
    type: "boolean",
    control: "boolean",
    required: false,
    description: "Indicates whether the user can interact with the element.",
  },
  form: {
    type: "string",
    control: "text",
    required: false,
    description: "Indicates the form that is the owner of the element.",
  },
  formAction: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Indicates the action of the element, overriding the action defined inthe form.",
  },
  formEncType: {
    type: "string",
    control: "radio",
    required: false,
    options: [
      "application/x-www-form-urlencoded",
      "multipart/form-data",
      "text/plain",
    ],
    description:
      'If the button/input is a submit button (e.g. type="submit"), this attribute sets the encoding type to use during form submission. If this attribute is specified, it overrides theenctype attribute of the button\'s form owner.',
  },
  formMethod: {
    type: "string",
    control: "radio",
    required: false,
    options: ["GET", "POST", "dialog"],
    description:
      'If the button/input is a submit button (e.g. type="submit"), this attribute sets the submission method to use during form submission (GET, POST, etc.). If this attribute is specified, it overrides the method attribute of the button\'s form owner.',
  },
  formNoValidate: {
    type: "boolean",
    control: "boolean",
    required: false,
    description:
      'If the button/input is a submit button (e.g. type="submit"), this boolean attribute specifies that the form is not to be validatedwhen it is submitted. If this attribute is specified, it overrides thenovalidate attribute of the button\'s form owner.',
  },
  formTarget: {
    type: "string",
    control: "text",
    required: false,
    description:
      'If the button/input is a submit button (e.g. type="submit"), this attribute specifies the browsing context (for example, tab, window, or inline frame) in which to display the response that is received aftersubmitting the form. If this attribute is specified, it overrides thetarget attribute of the button\'s form owner.',
  },
  height: {
    type: "number",
    control: "number",
    required: false,
    description: "Defines the image’s height in pixels.",
  },
  list: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Identifies a list of pre-defined options to suggest to the user.",
  },
  max: {
    type: "string",
    control: "text",
    required: false,
    description: "Indicates the maximum value allowed.",
  },
  maxLength: {
    type: "number",
    control: "number",
    required: false,
    description:
      "Defines the maximum number of characters allowed in the element.",
  },
  min: {
    type: "string",
    control: "text",
    required: false,
    description: "Indicates the minimum value allowed.",
  },
  minLength: {
    type: "number",
    control: "number",
    required: false,
    description:
      "Defines the minimum number of characters allowed in the element.",
  },
  multiple: {
    type: "boolean",
    control: "boolean",
    required: false,
    description:
      "Indicates whether multiple values can be entered in an input of the type email or file.",
  },
  name: {
    type: "string",
    control: "text",
    required: false,
    description:
      "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
  },
  pattern: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Defines a regular expression which the element's value will be validated against.",
  },
  placeholder: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Provides a hint to the user of what can be entered in the field.",
  },
  popovertarget: { type: "string", control: "text", required: false },
  popovertargetaction: {
    type: "string",
    control: "radio",
    required: false,
    options: ["toggle", "show", "hide"],
  },
  readOnly: {
    type: "boolean",
    control: "boolean",
    required: false,
    description: "Indicates whether the element can be edited.",
  },
  required: {
    type: "boolean",
    control: "boolean",
    required: false,
    description:
      "Indicates whether this form element must be filled before the form can be submitted.",
  },
  size: {
    type: "number",
    control: "number",
    required: false,
    description:
      "Defines the width of the element (in pixels). If the element'stype attribute is text or password then it's the number of characters.",
  },
  src: {
    type: "string",
    control: "text",
    required: false,
    description: "The URL of the embeddable content.",
  },
  step: { type: "number", control: "number", required: false },
  title: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Text to be displayed in a tooltip when hovering over the element.",
  },
  type: {
    type: "string",
    control: "text",
    required: false,
    description: "Defines the type of the element.",
  },
  value: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Defines a default value which will be displayed in the element on pageload.",
  },
  width: {
    type: "number",
    control: "number",
    required: false,
    description: "Defines the image’s width in pixels.",
  },
};

export const ins = {
  ...globals,
  cite: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Contains a URI which points to the source of the quote or change.",
  },
  dateTime: {
    type: "string",
    control: "text",
    required: false,
    description: "Indicates the date and time associated with the element.",
  },
};

export const kbd = globals;

export const label = {
  ...globals,
  htmlFor: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Associates this Label with an Input. The value of the “For” attribute should match the ID attribute of the corresponding Input element",
  },
};

export const legend = globals;

export const li = {
  ...globals,
  value: {
    type: "number",
    control: "number",
    required: false,
    description:
      "Defines a default value which will be displayed in the element on pageload.",
  },
};

export const link = {
  ...globals,
  as: { type: "string", control: "radio", required: false, options: [] },
  blocking: { type: "string", control: "text", required: false },
  color: {
    type: "string",
    control: "text",
    required: false,
    description:
      "This attribute sets the text color using either a named color or a  color specified in the hexadecimal #RRGGBB format. Note: This is a legacy attribute. Please use the CSS color property instead.",
  },
  crossOrigin: {
    type: "string",
    control: "radio",
    required: false,
    options: ["anonymous", "use-credentials"],
    description: "How the element handles cross-origin requests",
  },
  disabled: {
    type: "boolean",
    control: "boolean",
    required: false,
    description: "Indicates whether the user can interact with the element.",
  },
  fetchPriority: {
    type: "string",
    control: "radio",
    required: false,
    options: ["auto", "high", "low"],
  },
  href: {
    type: "string",
    control: "text",
    required: false,
    description: "The URL of a linked resource.",
  },
  hrefLang: {
    type: "string",
    control: "text",
    required: false,
    description: "Specifies the language of the linked resource.",
  },
  imageSizes: { type: "string", control: "text", required: false },
  imageSrcSet: { type: "string", control: "text", required: false },
  integrity: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Specifies a  Subresource Integrity  value that allows browsers to verify what they fetch.",
  },
  media: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Specifies a hint of the media for which the linked resource was designed.",
  },
  referrerPolicy: {
    type: "string",
    control: "text",
    required: false,
    description: "Specifies which referrer is sent when fetching the resource.",
  },
  rel: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Specifies the relationship of the target object to the link object.",
  },
  sizes: { type: "string", control: "text", required: false },
  title: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Text to be displayed in a tooltip when hovering over the element.",
  },
  type: {
    type: "string",
    control: "text",
    required: false,
    description: "Defines the type of the element.",
  },
};

export const main = globals;

export const map = {
  ...globals,
  name: {
    type: "string",
    control: "text",
    required: false,
    description:
      "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
  },
};

export const mark = globals;

export const math = globals;

export const menu = globals;

export const menuitem = globals;

export const meta = {
  ...globals,
  charSet: {
    type: "string",
    control: "text",
    required: false,
    description: "Declares the character encoding of the page or script.",
  },
  content: {
    type: "string",
    control: "text",
    required: false,
    description:
      "A value associated with http-equiv orname depending on the context.",
  },
  httpEquiv: {
    type: "string",
    control: "select",
    required: false,
    options: [
      "content-type",
      "default-style",
      "refresh",
      "x-ua-compatible",
      "content-security-policy",
    ],
    description: "Defines a pragma directive.",
  },
  media: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Specifies a hint of the media for which the linked resource was designed.",
  },
  name: {
    type: "string",
    control: "text",
    required: false,
    description:
      "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
  },
};

export const meter = {
  ...globals,
  high: {
    type: "number",
    control: "number",
    required: false,
    description: "Indicates the lower bound of the upper range.",
  },
  low: {
    type: "number",
    control: "number",
    required: false,
    description: "Indicates the upper bound of the lower range.",
  },
  max: {
    type: "number",
    control: "number",
    required: false,
    description: "Indicates the maximum value allowed.",
  },
  min: {
    type: "number",
    control: "number",
    required: false,
    description: "Indicates the minimum value allowed.",
  },
  optimum: {
    type: "number",
    control: "number",
    required: false,
    description: "Indicates the optimal numeric value.",
  },
  value: {
    type: "number",
    control: "number",
    required: false,
    description:
      "Defines a default value which will be displayed in the element on pageload.",
  },
};

export const nav = globals;

export const noscript = globals;

export const object = {
  ...globals,
  data: {
    type: "string",
    control: "text",
    required: false,
    description: "Specifies the URL of the resource.",
  },
  form: {
    type: "string",
    control: "text",
    required: false,
    description: "Indicates the form that is the owner of the element.",
  },
  height: {
    type: "number",
    control: "number",
    required: false,
    description: "Defines the image’s height in pixels.",
  },
  name: {
    type: "string",
    control: "text",
    required: false,
    description:
      "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
  },
  type: {
    type: "string",
    control: "text",
    required: false,
    description: "Defines the type of the element.",
  },
  width: {
    type: "number",
    control: "number",
    required: false,
    description: "Defines the image’s width in pixels.",
  },
};

export const ol = {
  ...globals,
  reversed: {
    type: "boolean",
    control: "boolean",
    required: false,
    description:
      "Indicates whether the list should be displayed in a descending order instead of an ascending order.",
  },
  start: {
    type: "number",
    control: "number",
    required: false,
    description: "Defines the first number if other than 1.",
  },
  type: {
    type: "string",
    control: "select",
    required: false,
    options: ["1", "a", "A", "i", "I"],
    description: "Defines the type of the element.",
  },
};

export const optgroup = {
  ...globals,
  disabled: {
    type: "boolean",
    control: "boolean",
    required: false,
    description: "Indicates whether the user can interact with the element.",
  },
  label: {
    type: "string",
    control: "text",
    required: false,
    description: "Specifies a user-readable title of the element.",
  },
};

export const option = {
  ...globals,
  disabled: {
    type: "boolean",
    control: "boolean",
    required: false,
    description: "Indicates whether the user can interact with the element.",
  },
  label: {
    type: "string",
    control: "text",
    required: false,
    description: "Specifies a user-readable title of the element.",
  },
  selected: {
    type: "boolean",
    control: "boolean",
    required: false,
    description: "Defines a value which will be selected on page load.",
  },
  value: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Defines a default value which will be displayed in the element on pageload.",
  },
};

export const output = {
  ...globals,
  htmlFor: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Associates this Label with an Input. The value of the “For” attribute should match the ID attribute of the corresponding Input element",
  },
  form: {
    type: "string",
    control: "text",
    required: false,
    description: "Indicates the form that is the owner of the element.",
  },
  name: {
    type: "string",
    control: "text",
    required: false,
    description:
      "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
  },
};

export const p = globals;

export const param = globals;

export const picture = globals;

export const pre = globals;

export const progress = {
  ...globals,
  max: {
    type: "number",
    control: "number",
    required: false,
    description: "Indicates the maximum value allowed.",
  },
  value: {
    type: "number",
    control: "number",
    required: false,
    description:
      "Defines a default value which will be displayed in the element on pageload.",
  },
};

export const q = {
  ...globals,
  cite: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Contains a URI which points to the source of the quote or change.",
  },
};

export const rb = globals;

export const rp = globals;

export const rt = globals;

export const rtc = globals;

export const ruby = globals;

export const s = globals;

export const samp = globals;

export const script = {
  ...globals,
  async: {
    type: "boolean",
    control: "boolean",
    required: false,
    description: "Executes the script asynchronously.",
  },
  blocking: { type: "string", control: "text", required: false },
  crossOrigin: {
    type: "string",
    control: "radio",
    required: false,
    options: ["anonymous", "use-credentials"],
    description: "How the element handles cross-origin requests",
  },
  defer: {
    type: "boolean",
    control: "boolean",
    required: false,
    description:
      "Indicates that the script should be executed after the page has beenparsed.",
  },
  fetchPriority: {
    type: "string",
    control: "radio",
    required: false,
    options: ["auto", "high", "low"],
  },
  integrity: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Specifies a  Subresource Integrity  value that allows browsers to verify what they fetch.",
  },
  noModule: { type: "boolean", control: "boolean", required: false },
  referrerPolicy: {
    type: "string",
    control: "text",
    required: false,
    description: "Specifies which referrer is sent when fetching the resource.",
  },
  src: {
    type: "string",
    control: "text",
    required: false,
    description: "The URL of the embeddable content.",
  },
  type: {
    type: "string",
    control: "radio",
    required: false,
    options: ["module"],
    description: "Defines the type of the element.",
  },
};

export const search = globals;

export const section = globals;

export const select = {
  ...globals,
  autoComplete: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Indicates whether controls in this form can by default have their valuesautomatically completed by the browser.",
  },
  disabled: {
    type: "boolean",
    control: "boolean",
    required: false,
    description: "Indicates whether the user can interact with the element.",
  },
  form: {
    type: "string",
    control: "text",
    required: false,
    description: "Indicates the form that is the owner of the element.",
  },
  multiple: {
    type: "boolean",
    control: "boolean",
    required: false,
    description:
      "Indicates whether multiple values can be entered in an input of the type email or file.",
  },
  name: {
    type: "string",
    control: "text",
    required: false,
    description:
      "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
  },
  required: {
    type: "boolean",
    control: "boolean",
    required: false,
    description:
      "Indicates whether this form element must be filled before the form can be submitted.",
  },
  size: {
    type: "number",
    control: "number",
    required: false,
    description:
      "Defines the width of the element (in pixels). If the element'stype attribute is text or password then it's the number of characters.",
  },
};

export const slot = {
  ...globals,
  name: {
    type: "string",
    control: "text",
    required: false,
    description:
      "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
  },
};

export const small = globals;

export const source = {
  ...globals,
  height: {
    type: "number",
    control: "number",
    required: false,
    description: "Defines the image’s height in pixels.",
  },
  media: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Specifies a hint of the media for which the linked resource was designed.",
  },
  sizes: { type: "string", control: "text", required: false },
  src: {
    type: "string",
    control: "text",
    required: false,
    description: "The URL of the embeddable content.",
  },
  srcSet: {
    type: "string",
    control: "text",
    required: false,
    description: "One or more responsive image candidates.",
  },
  type: {
    type: "string",
    control: "text",
    required: false,
    description: "Defines the type of the element.",
  },
  width: {
    type: "number",
    control: "number",
    required: false,
    description: "Defines the image’s width in pixels.",
  },
};

export const span = globals;

export const strong = globals;

export const style = {
  ...globals,
  blocking: { type: "string", control: "text", required: false },
  media: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Specifies a hint of the media for which the linked resource was designed.",
  },
  title: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Text to be displayed in a tooltip when hovering over the element.",
  },
};

export const sub = globals;

export const summary = globals;

export const sup = globals;

export const svg = globals;

export const table = globals;

export const tbody = globals;

export const td = {
  ...globals,
  colSpan: {
    type: "number",
    control: "number",
    required: false,
    description:
      "The colspan attribute defines the number of columns a cell should span.",
  },
  headers: {
    type: "string",
    control: "text",
    required: false,
    description: "IDs of the <th> elements which applies to this element.",
  },
  rowSpan: {
    type: "number",
    control: "number",
    required: false,
    description: "Defines the number of rows a table cell should span over.",
  },
};

export const template = globals;

export const textarea = {
  ...globals,
  autoComplete: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Indicates whether controls in this form can by default have their valuesautomatically completed by the browser.",
  },
  cols: {
    type: "number",
    control: "number",
    required: false,
    description: "Defines the number of columns in a textarea.",
  },
  dirname: { type: "string", control: "text", required: false },
  disabled: {
    type: "boolean",
    control: "boolean",
    required: false,
    description: "Indicates whether the user can interact with the element.",
  },
  form: {
    type: "string",
    control: "text",
    required: false,
    description: "Indicates the form that is the owner of the element.",
  },
  maxLength: {
    type: "number",
    control: "number",
    required: false,
    description:
      "Defines the maximum number of characters allowed in the element.",
  },
  minLength: {
    type: "number",
    control: "number",
    required: false,
    description:
      "Defines the minimum number of characters allowed in the element.",
  },
  name: {
    type: "string",
    control: "text",
    required: false,
    description:
      "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
  },
  placeholder: {
    type: "string",
    control: "text",
    required: false,
    description:
      "Provides a hint to the user of what can be entered in the field.",
  },
  readOnly: {
    type: "boolean",
    control: "boolean",
    required: false,
    description: "Indicates whether the element can be edited.",
  },
  required: {
    type: "boolean",
    control: "boolean",
    required: false,
    description:
      "Indicates whether this form element must be filled before the form can be submitted.",
  },
  rows: {
    type: "number",
    control: "number",
    required: false,
    description: "Defines the number of rows in a text area.",
  },
  wrap: {
    type: "string",
    control: "radio",
    required: false,
    options: ["soft", "hard"],
    description: "Indicates whether the text should be wrapped.",
  },
};

export const tfoot = globals;

export const th = {
  ...globals,
  abbr: { type: "string", control: "text", required: false },
  colSpan: {
    type: "number",
    control: "number",
    required: false,
    description:
      "The colspan attribute defines the number of columns a cell should span.",
  },
  headers: {
    type: "string",
    control: "text",
    required: false,
    description: "IDs of the <th> elements which applies to this element.",
  },
  rowSpan: {
    type: "number",
    control: "number",
    required: false,
    description: "Defines the number of rows a table cell should span over.",
  },
  scope: {
    type: "string",
    control: "select",
    required: false,
    options: ["row", "col", "rowgroup", "colgroup"],
    description:
      "Defines the cells that the header test (defined in theth element) relates to.",
  },
};

export const thead = globals;

export const time = {
  ...globals,
  dateTime: {
    type: "number",
    control: "number",
    required: false,
    description: "Indicates the date and time associated with the element.",
  },
};

export const title = globals;

export const tr = globals;

export const track = {
  ...globals,
  default: {
    type: "boolean",
    control: "boolean",
    required: false,
    description:
      "Indicates that the track should be enabled unless the user's preferencesindicate something different.",
  },
  kind: {
    type: "string",
    control: "select",
    required: false,
    options: ["subtitles", "captions", "descriptions", "chapters", "metadata"],
    description: "Specifies the kind of text track.",
  },
  label: {
    type: "string",
    control: "text",
    required: false,
    description: "Specifies a user-readable title of the element.",
  },
  src: {
    type: "string",
    control: "text",
    required: false,
    description: "The URL of the embeddable content.",
  },
  srcLang: { type: "string", control: "text", required: false },
};

export const u = globals;

export const ul = globals;

const _var = globals;
export { _var as var };

export const video = {
  ...globals,
  autoPlay: {
    type: "boolean",
    control: "boolean",
    required: false,
    description: "The audio or video should play as soon as possible.",
  },
  controls: {
    type: "boolean",
    control: "boolean",
    required: false,
    description:
      "Indicates whether the browser should show playback controls to the user.",
  },
  crossOrigin: {
    type: "string",
    control: "radio",
    required: false,
    options: ["anonymous", "use-credentials"],
    description: "How the element handles cross-origin requests",
  },
  height: {
    type: "number",
    control: "number",
    required: false,
    description: "Defines the image’s height in pixels.",
  },
  loop: {
    type: "boolean",
    control: "boolean",
    required: false,
    description:
      "Indicates whether the media should start playing from the start when it's finished.",
  },
  muted: {
    type: "boolean",
    control: "boolean",
    required: false,
    description:
      "Indicates whether the audio will be initially silenced on page load.",
  },
  playsInline: {
    type: "boolean",
    control: "boolean",
    required: false,
    description:
      'A Boolean attribute indicating that the video is to be played "inline"; that is, within the element\'s playback area. Note that the absence of this attribute does not imply that the video will always be played in fullscreen.',
  },
  poster: {
    type: "string",
    control: "text",
    required: false,
    description:
      "A URL indicating a poster frame to show until the user plays or seeks.",
  },
  preload: {
    type: "string",
    control: "radio",
    required: false,
    options: ["none", "metadata", "auto"],
    description:
      "Indicates whether the whole resource, parts of it or nothing should be preloaded.",
  },
  src: {
    type: "string",
    control: "text",
    required: false,
    description: "The URL of the embeddable content.",
  },
  width: {
    type: "number",
    control: "number",
    required: false,
    description: "Defines the image’s width in pixels.",
  },
};

export const wbr = globals;
