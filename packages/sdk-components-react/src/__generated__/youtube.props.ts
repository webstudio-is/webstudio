import type { PropMeta } from "@webstudio-is/sdk";

export const props: Record<string, PropMeta> = {
  about: { required: false, control: "text", type: "string" },
  accessKey: {
    required: false,
    control: "text",
    type: "string",
    description: "Keyboard shortcut to activate or add focus to the element.",
  },
  allowFullscreen: {
    description: "Whether to allow fullscreen mode.\nOriginal parameter: `fs`",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: true,
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
  autoplay: {
    description:
      "Whether the video should autoplay.\nSome browsers require the `muted` parameter to be set to `true` for autoplay to work.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: false,
  },
  autoSave: { required: false, control: "text", type: "string" },
  captionLanguage: {
    description:
      "Specifies the default language that the player will use to display captions.\nThe value is an ISO 639-1 two-letter language code.\nOriginal parameter: `cc_lang_pref`",
    required: false,
    control: "text",
    type: "string",
  },
  className: { required: false, control: "text", type: "string" },
  color: {
    description:
      "Specifies the color that will be used in the player's video progress bar to highlight the amount of the video that the viewer has already seen.\nValid values are 'red' and 'white'.",
    required: false,
    control: "radio",
    type: "string",
    options: ["red", "white"],
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
  disableKeyboard: {
    description:
      "Whether to disable keyboard controls.\nOriginal parameter: `disablekb`",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: false,
  },
  draggable: {
    required: false,
    control: "boolean",
    type: "boolean",
    description: "Defines whether the element can be dragged.",
  },
  endTime: {
    description: "End time of the video in seconds.\nOriginal parameter: `end`",
    required: false,
    control: "number",
    type: "number",
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
  inline: {
    description: "Whether to play inline on mobile (not fullscreen).",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: false,
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
      "url",
      "none",
      "tel",
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
  keyboard: {
    description: "Whether to enable keyboard controls.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: true,
  },
  lang: {
    required: false,
    control: "text",
    type: "string",
    description: "Defines the language used in the element.",
  },
  language: {
    description:
      "Sets the player's interface language. The value is an ISO 639-1 two-letter language code or a fully specified locale.\nOriginal parameter: `hl`",
    required: false,
    control: "text",
    type: "string",
  },
  listId: {
    description: "ID of the playlist to load.\nOriginal parameter: `list`",
    required: false,
    control: "text",
    type: "string",
  },
  listType: {
    description: "Type of playlist to load.",
    required: false,
    control: "radio",
    type: "string",
    options: ["playlist", "user_uploads"],
  },
  loading: {
    description: "Loading strategy for iframe",
    required: false,
    control: "radio",
    type: "string",
    defaultValue: "lazy",
    options: ["eager", "lazy"],
  },
  loop: {
    description: "Whether the video should loop continuously.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: false,
  },
  muted: {
    description:
      "Whether the video should start muted.\nUseful for enabling autoplay in browsers that require videos to be muted.\nOriginal parameter: `mute`",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: false,
  },
  nonce: { required: false, control: "text", type: "string" },
  origin: {
    description:
      "Your domain for API compliance (e.g., `https://yourdomain.com`).",
    required: false,
    control: "text",
    type: "string",
  },
  playlist: {
    description:
      "This parameter specifies a comma-separated list of video IDs to play",
    required: false,
    control: "text",
    type: "string",
  },
  prefix: { required: false, control: "text", type: "string" },
  privacyEnhancedMode: {
    description:
      "The Privacy Enhanced Mode of the YouTube embedded player prevents the use of views of embedded YouTube content from influencing the viewer’s browsing experience on YouTube.\nhttps://support.google.com/youtube/answer/171780?hl=en#zippy=%2Cturn-on-privacy-enhanced-mode",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: true,
  },
  property: { required: false, control: "text", type: "string" },
  radioGroup: { required: false, control: "text", type: "string" },
  referrer: {
    description:
      "Referrer URL for tracking purposes.\nOriginal parameter: `widget_referrer`",
    required: false,
    control: "text",
    type: "string",
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
  showAnnotations: {
    description:
      "Whether to show annotations on the video.\nOriginal parameter: `iv_load_policy`",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: true,
  },
  showCaptions: {
    description:
      "Whether captions should be shown by default.\nOriginal parameter: `cc_load_policy`",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: false,
  },
  showControls: {
    description: "Whether to show player controls.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: true,
  },
  showPreview: { required: false, control: "boolean", type: "boolean" },
  showRelatedVideos: {
    description:
      "Whether to show related videos at the end.\nOriginal parameter: `rel`",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: true,
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
  startTime: {
    description:
      "Start time of the video in seconds.\nOriginal parameter: `start`",
    required: false,
    control: "number",
    type: "number",
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
    description:
      'The `title` attribute for the iframe.\nImproves accessibility by providing a brief description of the video content for screen readers.\nExample: "Video about web development tips".',
    required: false,
    control: "text",
    type: "string",
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
  url: {
    description: "The YouTube video URL or ID",
    required: false,
    control: "text",
    type: "string",
  },
  vocab: { required: false, control: "text", type: "string" },
};
