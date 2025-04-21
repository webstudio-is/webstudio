import { PlayIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta, WsComponentPropsMeta } from "@webstudio-is/sdk";
import { props } from "./__generated__/video-animation.props";

export const meta: WsComponentMeta = {
  icon: PlayIcon,
  label: "Video Animation",
  contentModel: {
    category: "none",
    children: ["instance"],
  },
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["timeline"],
};
