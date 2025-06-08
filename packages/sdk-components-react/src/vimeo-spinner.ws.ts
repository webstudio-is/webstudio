import type { WsComponentMeta } from "@webstudio-is/sdk";
import { div } from "@webstudio-is/sdk/normalize.css";
import { BoxIcon } from "@webstudio-is/icons/svg";
import { props } from "./__generated__/vimeo-spinner.props";

export const meta: WsComponentMeta = {
  icon: BoxIcon,
  category: "hidden",
  label: "Spinner",
  contentModel: {
    category: "none",
    children: ["instance"],
  },
  presetStyle: { div },
  initialProps: ["id", "class"],
  props,
};
