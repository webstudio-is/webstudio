import type { PropMeta } from "@webstudio-is/sdk";

export const props: Record<string, PropMeta> = {
  allowFullscreen: {
    description: "Whether to allow fullscreen mode.\nOriginal parameter: `fs`",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: true,
  },
  autoplay: {
    description:
      "Whether the video should autoplay.\nSome browsers require the `muted` parameter to be set to `true` for autoplay to work.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: false,
  },
  captionLanguage: {
    description:
      "Specifies the default language that the player will use to display captions.\nThe value is an ISO 639-1 two-letter language code.\nOriginal parameter: `cc_lang_pref`",
    required: false,
    control: "text",
    type: "string",
  },
  color: {
    description:
      "Specifies the color that will be used in the player's video progress bar to highlight the amount of the video that the viewer has already seen.\nValid values are 'red' and 'white'.",
    required: false,
    control: "radio",
    type: "string",
    options: ["red", "white"],
  },
  disableKeyboard: {
    description:
      "Whether to disable keyboard controls.\nOriginal parameter: `disablekb`",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: false,
  },
  endTime: {
    description: "End time of the video in seconds.\nOriginal parameter: `end`",
    required: false,
    control: "number",
    type: "number",
  },
  inline: {
    description: "Whether to play inline on mobile (not fullscreen).",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: false,
  },
  keyboard: {
    description: "Whether to enable keyboard controls.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: true,
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
  privacyEnhancedMode: {
    description:
      "The Privacy Enhanced Mode of the YouTube embedded player prevents the use of views of embedded YouTube content from influencing the viewer’s browsing experience on YouTube.\nhttps://support.google.com/youtube/answer/171780?hl=en#zippy=%2Cturn-on-privacy-enhanced-mode",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: true,
  },
  referrer: {
    description:
      "Referrer URL for tracking purposes.\nOriginal parameter: `widget_referrer`",
    required: false,
    control: "text",
    type: "string",
  },
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
  startTime: {
    description:
      "Start time of the video in seconds.\nOriginal parameter: `start`",
    required: false,
    control: "number",
    type: "number",
  },
  url: {
    description: "The YouTube video URL or ID",
    required: false,
    control: "text",
    type: "string",
  },
};
