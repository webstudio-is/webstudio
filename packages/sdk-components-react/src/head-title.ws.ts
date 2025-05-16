import { WindowTitleIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import { props } from "./__generated__/head-title.props";

export const meta: WsComponentMeta = {
  icon: WindowTitleIcon,
  contentModel: {
    category: "none",
    children: ["text"],
  },
  props,
};
