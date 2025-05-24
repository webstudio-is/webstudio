import { SlotComponentIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";

export const meta: WsComponentMeta = {
  category: "general",
  description:
    "Slot is a container for content that you want to reference across the project. Changes made to a Slot's children will be reflected in all other instances of that Slot.",
  icon: SlotComponentIcon,
  order: 4,
};
