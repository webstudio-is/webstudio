import { XmlIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import { props } from "./__generated__/xml-node.props";

export const meta: WsComponentMeta = {
  category: "xml",
  order: 6,
  icon: XmlIcon,
  description: "XML Node",
  initialProps: ["tag"],
  props,
};
