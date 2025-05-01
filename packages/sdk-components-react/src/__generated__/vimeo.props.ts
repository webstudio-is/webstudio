import type { PropMeta } from "@webstudio-is/sdk";

export const props: Record<string, PropMeta> = {
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
  backgroundMode: {
    description:
      "Whether the player is in background mode, which hides the playback controls, enables autoplay, and loops the video.",
    required: false,
    control: "boolean",
    type: "boolean",
  },
  controlsColor: {
    description:
      "A color value of the playback controls, which is normally #00ADEF. The embed settings of the video might override this value.",
    required: false,
    control: "color",
    type: "string",
  },
  doNotTrack: {
    description:
      "Whether to prevent the player from tracking session data, including cookies. Keep in mind that setting this argument to true also blocks video stats.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: false,
  },
  interactiveParams: {
    description:
      "Key-value pairs representing dynamic parameters that are utilized on interactive videos with live elements, such as title=my-video,subtitle=interactive.",
    required: false,
    control: "text",
    type: "string",
  },
  keyboard: {
    description:
      "Whether to enable keyboard input to trigger player events. This setting doesn't affect tab control.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: true,
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
  quality: {
    description:
      "For videos on a Vimeo Plus account or higher: the playback quality of the video. Use auto for the best possible quality given available bandwidth and other factors. You can also specify 360p, 540p, 720p, 1080p, 2k, and 4k.",
    required: false,
    control: "select",
    type: "string",
    defaultValue: "auto",
    options: ["auto", "360p", "540p", "720p", "1080p", "2k", "4k"],
  },
  responsive: {
    description:
      "Whether to return a responsive embed code, or one that provides intelligent adjustments based on viewing conditions. We recommend this option for mobile-optimized sites.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: true,
  },
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
  speed: {
    description:
      "Whether the player displays speed controls in the preferences menu and enables the playback rate API.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: false,
  },
  texttrack: {
    description:
      "The text track to display with the video. Specify the text track by its language code (en), the language code and locale (en-US), or the language code and kind (en.captions). For this argument to work, the video must already have a text track of the given type; see our Help Center or Working with Text Track Uploads for more information.\nTo enable automatically generated closed captions instead, provide the value en-x-autogen. Please note that, at the present time, automatic captions are always in English.",
    required: false,
    control: "text",
    type: "string",
  },
  transparent: {
    description:
      "Whether the responsive player and transparent background are enabled.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: true,
  },
  url: {
    description:
      "The ID or the URL of the video on Vimeo. You must supply one of these values to identify the video. When the video's privacy setting is Private, you must use the URL, and the URL must include the h parameter. For more information, see Vimeo’s introductory guide.",
    required: false,
    control: "text",
    type: "string",
  },
};
