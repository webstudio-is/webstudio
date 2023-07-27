import type { PropMeta } from "@webstudio-is/generate-arg-types";

export const props: Record<string, PropMeta> = {
  about: { required: false, control: "text", type: "string" },
  accessKey: { required: false, control: "text", type: "string" },
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
      "Defines a string value that labels the current element.\n@see aria-labelledby.",
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
  autoCapitalize: { required: false, control: "text", type: "string" },
  autoCorrect: { required: false, control: "text", type: "string" },
  autoFocus: { required: false, control: "boolean", type: "boolean" },
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
      "Whether to start playback of the video automatically. This feature might not work on all devices.",
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
    defaultValue: false,
  },
  className: { required: false, control: "text", type: "string" },
  color: { required: false, control: "color", type: "string" },
  content: { required: false, control: "text", type: "string" },
  contextMenu: { required: false, control: "text", type: "string" },
  controlsColor: {
    description:
      "A color value of the playback controls, which is normally #00ADEF. The embed settings of the video might override this value.",
    required: false,
    control: "color",
    type: "string",
  },
  datatype: { required: false, control: "text", type: "string" },
  defaultChecked: { required: false, control: "boolean", type: "boolean" },
  dir: { required: false, control: "text", type: "string" },
  doNotTrack: {
    description:
      "Whether to prevent the player from tracking session data, including cookies. Keep in mind that setting this argument to true also blocks video stats.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: false,
  },
  draggable: { required: false, control: "boolean", type: "boolean" },
  hidden: { required: false, control: "boolean", type: "boolean" },
  id: { required: false, control: "text", type: "string" },
  inputMode: {
    description:
      "Hints at the type of data that might be entered by the user while editing the element or its contents\n@see https://html.spec.whatwg.org/multipage/interaction.html#input-modalities:-the-inputmode-attribute",
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
  keyboard: {
    description:
      "Whether to enable keyboard input to trigger player events. This setting doesn't affect tab control.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: true,
  },
  lang: { required: false, control: "text", type: "string" },
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
  placeholder: { required: false, control: "text", type: "string" },
  playsinline: {
    description:
      "Whether the video plays inline on supported mobile devices. To force the device to play the video in fullscreen mode instead, set this value to false.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: true,
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
  rel: { required: false, control: "text", type: "string" },
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
  role: { required: false, control: "text", type: "string" },
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
      "Whether the preview image should be loaded from Vimeo API. Ideally don't use it, because it will show up with some delay and will make your site feel slower.",
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
  slot: { required: false, control: "text", type: "string" },
  speed: {
    description:
      "Whether the player displays speed controls in the preferences menu and enables the playback rate API.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: false,
  },
  spellCheck: { required: false, control: "boolean", type: "boolean" },
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
  tabIndex: { required: false, control: "number", type: "number" },
  texttrack: {
    description:
      "The text track to display with the video. Specify the text track by its language code (en), the language code and locale (en-US), or the language code and kind (en.captions). For this argument to work, the video must already have a text track of the given type; see our Help Center or Working with Text Track Uploads for more information.\nTo enable automatically generated closed captions instead, provide the value en-x-autogen. Please note that, at the present time, automatic captions are always in English.",
    required: false,
    control: "text",
    type: "string",
  },
  title: { required: false, control: "text", type: "string" },
  translate: {
    required: false,
    control: "radio",
    type: "string",
    options: ["yes", "no"],
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
      "The ID or the URL of the video on Vimeo. You must supply one of these values to identify the video. When the video's privacy setting is Private, you must use the URL, and the URL must include the h parameter. For more information, see our introductory guide.",
    required: false,
    control: "text",
    type: "string",
  },
  vocab: { required: false, control: "text", type: "string" },
};
