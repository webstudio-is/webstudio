import { HeaderIcon } from "@webstudio-is/icons/svg";
import {
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";

import { props } from "./__generated__/head.props";

export const meta: WsComponentMeta = {
  icon: HeaderIcon,
  type: "container",
  constraints: {
    relation: "ancestor",
    component: { $nin: ["Head"] },
  },
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: [],
};
