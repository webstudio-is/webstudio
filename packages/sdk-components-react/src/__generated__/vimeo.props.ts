import type { PropMeta } from "@webstudio-is/sdk";

export const props: Record<string, PropMeta> = {
  accessKey: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/accessKey)",
    required: true,
    control: "text",
    type: "string",
  },
  accessKeyLabel: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/accessKeyLabel)",
    required: true,
    control: "text",
    type: "string",
  },
  align: {
    description:
      "Sets or retrieves how the object is aligned with adjacent text.",
    required: true,
    control: "text",
    type: "string",
  },
  allow: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLIFrameElement/allow)",
    required: true,
    control: "text",
    type: "string",
  },
  allowFullscreen: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLIFrameElement/allowFullscreen)",
    required: true,
    control: "boolean",
    type: "boolean",
  },
  autocapitalize: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autocapitalize)",
    required: true,
    control: "text",
    type: "string",
  },
  autofocus: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autofocus)",
    required: true,
    control: "boolean",
    type: "boolean",
  },
  baseURI: {
    description:
      "Returns node's node document's document base URL.\n\n[MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/baseURI)",
    required: true,
    control: "text",
    type: "string",
  },
  childElementCount: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/childElementCount)",
    required: true,
    control: "number",
    type: "number",
  },
  className: {
    description:
      "Returns the value of element's class content attribute. Can be set to change it.\n\n[MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/className)",
    required: true,
    control: "text",
    type: "string",
  },
  clientHeight: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientHeight)",
    required: true,
    control: "number",
    type: "number",
  },
  clientLeft: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientLeft)",
    required: true,
    control: "number",
    type: "number",
  },
  clientTop: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientTop)",
    required: true,
    control: "number",
    type: "number",
  },
  clientWidth: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientWidth)",
    required: true,
    control: "number",
    type: "number",
  },
  contentEditable: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/contentEditable)",
    required: true,
    control: "text",
    type: "string",
  },
  currentCSSZoom: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/currentCSSZoom)",
    required: true,
    control: "number",
    type: "number",
  },
  dir: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dir)",
    required: true,
    control: "text",
    type: "string",
  },
  draggable: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/draggable)",
    required: true,
    control: "boolean",
    type: "boolean",
  },
  enterKeyHint: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/enterKeyHint)",
    required: true,
    control: "text",
    type: "string",
  },
  frameBorder: {
    description: "Sets or retrieves whether to display a border for the frame.",
    required: true,
    control: "text",
    type: "string",
  },
  height: {
    description:
      "Sets or retrieves the height of the object.\n\n[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLIFrameElement/height)",
    required: true,
    control: "text",
    type: "string",
  },
  hidden: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/hidden)",
    required: true,
    control: "boolean",
    type: "boolean",
  },
  id: {
    description:
      "Returns the value of element's id content attribute. Can be set to change it.\n\n[MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/id)",
    required: true,
    control: "text",
    type: "string",
  },
  inert: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/inert)",
    required: true,
    control: "boolean",
    type: "boolean",
  },
  innerHTML: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/innerHTML)",
    required: true,
    control: "text",
    type: "string",
  },
  innerText: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/innerText)",
    required: true,
    control: "text",
    type: "string",
  },
  inputMode: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/inputMode)",
    required: true,
    control: "text",
    type: "string",
  },
  isConnected: {
    description:
      "Returns true if node is connected and false otherwise.\n\n[MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/isConnected)",
    required: true,
    control: "boolean",
    type: "boolean",
  },
  isContentEditable: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/isContentEditable)",
    required: true,
    control: "boolean",
    type: "boolean",
  },
  lang: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/lang)",
    required: true,
    control: "text",
    type: "string",
  },
  loading: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLIFrameElement/loading)",
    required: false,
    control: "text",
    type: "string",
    defaultValue: "lazy",
  },
  localName: {
    description:
      "Returns the local name.\n\n[MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/localName)",
    required: true,
    control: "text",
    type: "string",
  },
  longDesc: {
    description: "Sets or retrieves a URI to a long description of the object.",
    required: true,
    control: "text",
    type: "string",
  },
  marginHeight: {
    description:
      "Sets or retrieves the top and bottom margin heights before displaying the text in a frame.",
    required: true,
    control: "text",
    type: "string",
  },
  marginWidth: {
    description:
      "Sets or retrieves the left and right margin widths before displaying the text in a frame.",
    required: true,
    control: "text",
    type: "string",
  },
  name: {
    description:
      "Sets or retrieves the frame name.\n\n[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLIFrameElement/name)",
    required: true,
    control: "text",
    type: "string",
  },
  nodeName: {
    description:
      "Returns a string appropriate for the type of node.\n\n[MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeName)",
    required: true,
    control: "text",
    type: "string",
  },
  nodeType: {
    description:
      "Returns the type of node.\n\n[MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeType)",
    required: true,
    control: "number",
    type: "number",
  },
  nonce: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/nonce)",
    required: false,
    control: "text",
    type: "string",
  },
  offsetHeight: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetHeight)",
    required: true,
    control: "number",
    type: "number",
  },
  offsetLeft: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetLeft)",
    required: true,
    control: "number",
    type: "number",
  },
  offsetTop: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetTop)",
    required: true,
    control: "number",
    type: "number",
  },
  offsetWidth: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetWidth)",
    required: true,
    control: "number",
    type: "number",
  },
  outerHTML: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/outerHTML)",
    required: true,
    control: "text",
    type: "string",
  },
  outerText: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/outerText)",
    required: true,
    control: "text",
    type: "string",
  },
  referrerPolicy: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLIFrameElement/referrerPolicy)",
    required: true,
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
  },
  role: {
    required: true,
    control: "text",
    type: "string",
    description:
      "Defines an explicit role for an element for use by assistive technologies.",
  },
  scrollHeight: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollHeight)",
    required: true,
    control: "number",
    type: "number",
  },
  scrolling: {
    description: "Sets or retrieves whether the frame can be scrolled.",
    required: true,
    control: "text",
    type: "string",
  },
  scrollLeft: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollLeft)",
    required: true,
    control: "number",
    type: "number",
  },
  scrollTop: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollTop)",
    required: true,
    control: "number",
    type: "number",
  },
  scrollWidth: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollWidth)",
    required: true,
    control: "number",
    type: "number",
  },
  slot: {
    description:
      "Returns the value of element's slot content attribute. Can be set to change it.\n\n[MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/slot)",
    required: true,
    control: "text",
    type: "string",
  },
  spellcheck: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/spellcheck)",
    required: true,
    control: "boolean",
    type: "boolean",
  },
  src: {
    description:
      "Sets or retrieves a URL to be loaded by the object.\n\n[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLIFrameElement/src)",
    required: true,
    control: "text",
    type: "string",
  },
  srcdoc: {
    description:
      "Sets or retrives the content of the page that is to contain.\n\n[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLIFrameElement/srcdoc)",
    required: true,
    control: "text",
    type: "string",
  },
  tabIndex: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/tabIndex)",
    required: true,
    control: "number",
    type: "number",
  },
  tagName: {
    description:
      "Returns the HTML-uppercased qualified name.\n\n[MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/tagName)",
    required: true,
    control: "text",
    type: "string",
  },
  title: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/title)",
    required: true,
    control: "text",
    type: "string",
  },
  translate: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/translate)",
    required: true,
    control: "boolean",
    type: "boolean",
  },
  width: {
    description:
      "Sets or retrieves the width of the object.\n\n[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLIFrameElement/width)",
    required: true,
    control: "text",
    type: "string",
  },
  writingSuggestions: {
    description:
      "[MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/writingSuggestions)",
    required: true,
    control: "text",
    type: "string",
  },
};
