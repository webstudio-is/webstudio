import { Link2Icon } from "@webstudio-is/icons/svg";
import {
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";

import { props } from "./__generated__/head-link.props";

export const meta: WsComponentMeta = {
  category: "hidden",
  icon: Link2Icon,
  type: "container",
  constraints: {
    relation: "parent",
    component: { $eq: "Head" },
  },
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["rel", "href", "type", "hreflang"],
};
