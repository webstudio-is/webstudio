import { HeaderIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import { props } from "./__generated__/head-slot.props";

export const meta: WsComponentMeta = {
  icon: HeaderIcon,
  description: "Inserts children into the head of the document",
  contentModel: {
    category: "instance",
    children: ["HeadLink", "HeadMeta", "HeadTitle"],
  },
  props,
};
