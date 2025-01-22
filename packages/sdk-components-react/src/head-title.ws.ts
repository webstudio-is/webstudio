import { WindowTitleIcon } from "@webstudio-is/icons/svg";
import {
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";

import { props } from "./__generated__/head-title.props";

export const meta: WsComponentMeta = {
  category: "hidden",
  icon: WindowTitleIcon,
  type: "container",
  stylable: false,
  constraints: {
    relation: "parent",
    component: { $eq: "HeadSlot" },
  },
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
