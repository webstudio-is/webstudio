import { VideoIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";

import { props } from "./__generated__/video.props";

export const meta: WsComponentMeta = {
  icon: VideoIcon,
  contentModel: {
    category: "instance",
    children: [],
  },
  presetStyle: {
    video: [
      {
        property: "max-width",
        value: { type: "unit", unit: "%", value: 100 },
      },
    ],
  },
  initialProps: [
    "id",
    "class",
    "width",
    "height",
    "src",
    "autoPlay",
    "controls",
    "loop",
    "muted",
    "preload",
    "playsInline",
  ],
  props: {
    ...props,
    // Automatically generated props don't have the right control.
    src: {
      type: "string",
      control: "file",
      label: "Source",
      required: false,
      accept: ".mp4,.webm,.mpg,.mpeg,.mov",
    },
  },
};
