import { PlayIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import { props } from "./__generated__/video-animation.props";
import { div } from "@webstudio-is/sdk/normalize.css";

export const meta: WsComponentMeta = {
  icon: PlayIcon,
  label: "Video Animation",
  contentModel: {
    category: "none",
    children: ["instance"],
  },
  presetStyle: { div },
  props,
  initialProps: ["timeline"],
};
