import type { ComponentProps } from "react";
import { YoutubeIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import { div } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/youtube.props";
import type { YouTube } from "./youtube";

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

export const meta: WsComponentMeta = {
  icon: YoutubeIcon,
  contentModel: {
    category: "instance",
    children: ["instance"],
    descendants: ["VimeoSpinner", "VimeoPlayButton", "VimeoPreviewImage"],
  },
  presetStyle: { div },
  initialProps,
  props,
};
