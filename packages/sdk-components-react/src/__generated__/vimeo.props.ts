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
  autopause: {
    description:
      "Whether to pause the current video when another Vimeo video on the same page starts to play. Set this value to false to permit simultaneous playback of all the videos on the page. This option has no effect if you've disabled cookies in your browser, either through browser settings or with an extension or plugin.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: true,
  },
  autopip: {
    description:
      "Whether to enable the browser to enter picture-in-picture mode automatically when switching tabs or windows, where supported.",
    required: false,
    control: "boolean",
    type: "boolean",
  },
  autoplay: {
    description:
      "Whether to start playback of the video automatically. This feature might not work on all devices.\nSome browsers require the `muted` parameter to be set to `true` for autoplay to work.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: false,
  },
  autoSave: { required: false, control: "text", type: "string" },
  backgroundMode: {
    description:
      "Whether the player is in background mode, which hides the playback controls, enables autoplay, and loops the video.",
    required: false,
    control: "boolean",
    type: "boolean",
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
  controlsColor: {
    description:
      "A color value of the playback controls, which is normally #00ADEF. The embed settings of the video might override this value.",
    required: false,
    control: "color",
    type: "string",
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
  doNotTrack: {
    description:
      "Whether to prevent the player from tracking session data, including cookies. Keep in mind that setting this argument to true also blocks video stats.",
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
      "url",
      "none",
      "tel",
      "email",
      "numeric",
      "decimal",
    ],
  },
  interactiveParams: {
    description:
      "Key-value pairs representing dynamic parameters that are utilized on interactive videos with live elements, such as title=my-video,subtitle=interactive.",
    required: false,
    control: "text",
    type: "string",
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
    description:
      "Whether to enable keyboard input to trigger player events. This setting doesn't affect tab control.",
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
  loading: {
    description:
      "Not a Vimeo attribute: Loading attribute for the iframe allows to eager or lazy load the source",
    required: false,
    control: "radio",
    type: "string",
    defaultValue: "lazy",
    options: ["eager", "lazy"],
  },
  loop: {
    description:
      "Whether to restart the video automatically after reaching the end.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: false,
  },
  muted: {
    description:
      "Whether the video is muted upon loading. The true value is required for the autoplay behavior in some browsers.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: false,
  },
  nonce: { required: false, control: "text", type: "string" },
  pip: {
    description:
      "Whether to include the picture-in-picture button among the player controls and enable the picture-in-picture API.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: false,
  },
  playsinline: {
    description:
      "Whether the video plays inline on supported mobile devices. To force the device to play the video in fullscreen mode instead, set this value to false.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: false,
  },
  prefix: { required: false, control: "text", type: "string" },
  property: { required: false, control: "text", type: "string" },
  quality: {
    description:
      "For videos on a Vimeo Plus account or higher: the playback quality of the video. Use auto for the best possible quality given available bandwidth and other factors. You can also specify 360p, 540p, 720p, 1080p, 2k, and 4k.",
    required: false,
    control: "select",
    type: "string",
    defaultValue: "auto",
    options: ["auto", "360p", "540p", "720p", "1080p", "2k", "4k"],
  },
  radioGroup: { required: false, control: "text", type: "string" },
  rel: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Specifies the relationship of the target object to the link object.",
  },
  resource: { required: false, control: "text", type: "string" },
  responsive: {
    description:
      "Whether to return a responsive embed code, or one that provides intelligent adjustments based on viewing conditions. We recommend this option for mobile-optimized sites.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: true,
  },
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
  showByline: {
    description: "Whether to display the video owner's name.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: false,
  },
  showControls: {
    description:
      "Whether to display the player's interactive elements, including the play bar and sharing buttons. Set this option to false for a chromeless experience. To control playback when the play/pause button is hidden, set autoplay to true, use keyboard controls (which remain active), or implement our player SDK.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: true,
  },
  showPortrait: {
    description:
      "Whether to display the video owner's portrait. Only works if either title or byline are also enabled",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: true,
  },
  showPreview: {
    description:
      "Not a Vimeo attribute: Whether the preview image should be loaded from Vimeo API. Ideally don't use it, because it will show up with some delay and will make your project feel slower.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: false,
  },
  showTitle: {
    description: "Whether the player displays the title overlay.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: false,
  },
  slot: {
    required: false,
    control: "text",
    type: "string",
    description: "Assigns a slot in a shadow DOM shadow tree to an element.",
  },
  speed: {
    description:
      "Whether the player displays speed controls in the preferences menu and enables the playback rate API.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: false,
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
  texttrack: {
    description:
      "The text track to display with the video. Specify the text track by its language code (en), the language code and locale (en-US), or the language code and kind (en.captions). For this argument to work, the video must already have a text track of the given type; see our Help Center or Working with Text Track Uploads for more information.\nTo enable automatically generated closed captions instead, provide the value en-x-autogen. Please note that, at the present time, automatic captions are always in English.",
    required: false,
    control: "text",
    type: "string",
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
  transparent: {
    description:
      "Whether the responsive player and transparent background are enabled.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: true,
  },
  typeof: { required: false, control: "text", type: "string" },
  unselectable: {
    required: false,
    control: "radio",
    type: "string",
    options: ["on", "off"],
  },
  url: {
    description:
      "The ID or the URL of the video on Vimeo. You must supply one of these values to identify the video. When the video's privacy setting is Private, you must use the URL, and the URL must include the h parameter. For more information, see Vimeo’s introductory guide.",
    required: false,
    control: "text",
    type: "string",
  },
  vocab: { required: false, control: "text", type: "string" },
};
