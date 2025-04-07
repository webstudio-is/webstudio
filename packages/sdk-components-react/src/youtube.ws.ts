import type { ComponentProps } from "react";
import { YoutubeIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";
import { div } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/youtube.props";
import type { YouTube } from "./youtube";

export const meta: WsComponentMeta = {
  type: "container",
  icon: YoutubeIcon,
  states: defaultStates,
  contentModel: {
    category: "instance",
    children: [
      "instance",
      "VimeoSpinner",
      "VimeoPlayButton",
      "VimeoPreviewImage",
    ],
  },
  presetStyle: {
    div,
  },
};

const initialProps: Array<keyof ComponentProps<typeof YouTube>> = [
  "id",
  "className",
  "url",
  "privacyEnhancedMode",
  "title",
  "loading",
  "showPreview",
  "autoplay",
  "showControls",
  "showRelatedVideos",
  "keyboard",
  "loop",
  "inline",
  "allowFullscreen",
  "showCaptions",
  "showAnnotations",
  "startTime",
  "endTime",
  "disableKeyboard",
  "referrer",
  "listType",
  "listId",
  "origin",
  "captionLanguage",
  "language",
  "color",
  "playlist",
];

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps,
};
