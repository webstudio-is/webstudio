import { WindowInfoIcon } from "@webstudio-is/icons/svg";
import {
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";

import { props } from "./__generated__/head-meta.props";

export const meta: WsComponentMeta = {
  category: "hidden",
  icon: WindowInfoIcon,
  type: "embed",
  constraints: {
    relation: "parent",
    component: { $eq: "HeadSlot" },
  },
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["name", "property", "content"],
};
