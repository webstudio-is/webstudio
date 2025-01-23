import { XmlIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta, WsComponentPropsMeta } from "@webstudio-is/sdk";
import { props } from "./__generated__/xml-node.props";

export const meta: WsComponentMeta = {
  category: "xml",
  order: 6,
  type: "container",
  icon: XmlIcon,
  description: "XML Node",
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["tag"],
};
