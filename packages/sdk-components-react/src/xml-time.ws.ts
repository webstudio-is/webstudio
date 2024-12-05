import { CalendarIcon } from "@webstudio-is/icons/svg";

import {
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";

import { props } from "./__generated__/xml-time.props";

export const meta: WsComponentMeta = {
  category: "xml",
  type: "container",
  description: "Converts machine-readable date and time to ISO format.",
  icon: CalendarIcon,
  stylable: false,
  order: 7,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["datetime", "dateStyle"],
};
