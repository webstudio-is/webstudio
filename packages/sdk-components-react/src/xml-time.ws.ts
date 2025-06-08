import { CalendarIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import { props } from "./__generated__/xml-time.props";

export const meta: WsComponentMeta = {
  category: "xml",
  description: "Converts machine-readable date and time to ISO format.",
  icon: CalendarIcon,
  order: 7,
  initialProps: ["datetime", "dateStyle"],
  props,
};
