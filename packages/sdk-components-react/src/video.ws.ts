import { VideoIcon } from "@webstudio-is/icons/svg";
import {
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";

import { props } from "./__generated__/video.props";

export const meta: WsComponentMeta = {
  type: "control",
  icon: VideoIcon,
  presetStyle: {
    video: [
      {
        property: "max-width",
        value: { type: "unit", unit: "%", value: 100 },
      },
    ],
  },
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: [
    "id",
    "className",
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
};
