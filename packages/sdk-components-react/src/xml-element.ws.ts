import { XIcon } from "@webstudio-is/icons/svg";

import {
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";

import { props } from "./__generated__/xml-element.props";

export const meta: WsComponentMeta = {
  category: "xml",
  order: 6,
  type: "container",
  icon: XIcon,
  stylable: false,
  description: "XmlElement",
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["tag"],
};
