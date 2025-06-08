import { ResourceIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import { props } from "./__generated__/head-link.props";

export const meta: WsComponentMeta = {
  icon: ResourceIcon,
  contentModel: {
    category: "none",
    children: [],
  },
  initialProps: ["rel", "hrefLang", "href", "type", "as"],
  props,
};
