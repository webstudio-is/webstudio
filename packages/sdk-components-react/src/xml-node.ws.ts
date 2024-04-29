import { XmlIcon } from "@webstudio-is/icons/svg";

import {
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";

import { props } from "./__generated__/xml-node.props";

export const meta: WsComponentMeta = {
  category: "xml",
  order: 6,
  type: "container",
  icon: XmlIcon,
  stylable: false,
  description: "Xml Node",
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["tag"],
};
