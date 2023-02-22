import { Link2Icon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-type";
import { props } from "./__generated__/rich-text-link.props";

export const meta: WsComponentMeta = {
  type: "rich-text-child",
  label: "Link",
  Icon: Link2Icon,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
