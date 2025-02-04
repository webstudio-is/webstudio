import { ResourceIcon } from "@webstudio-is/icons/svg";
import {
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";

import { props } from "./__generated__/head-link.props";

export const meta: WsComponentMeta = {
  category: "hidden",
  icon: ResourceIcon,
  type: "embed",
  constraints: {
    relation: "parent",
    component: { $eq: "HeadSlot" },
  },
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["rel", "hrefLang", "href", "type", "as"],
};
