import { HeaderIcon } from "@webstudio-is/icons/svg";
import {
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";

import { props } from "./__generated__/head.props";

export const meta: WsComponentMeta = {
  icon: HeaderIcon,
  type: "container",
  description: "Inserts children into the head of the document",
  constraints: [
    {
      relation: "ancestor",
      component: { $nin: ["HeadSlot"] },
    },
    {
      relation: "child",
      component: { $in: ["HeadLink", "HeadMeta", "HeadTitle"] },
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: [],
};
