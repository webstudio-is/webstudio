import { Youtube1cIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta, WsComponentPropsMeta } from "@webstudio-is/sdk";
import { animation } from "./shared/meta";

export const meta: WsComponentMeta = {
  type: "container",
  icon: Youtube1cIcon,
  label: "YouTube Animation",
  constraints: [
    { relation: "parent", component: { $eq: animation.AnimateChildren } },
    {
      relation: "child",
      text: false,
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props: {},
  initialProps: [],
};
