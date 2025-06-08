import { LabelIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import { label } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/label.props";

export const meta: WsComponentMeta = {
  icon: LabelIcon,
  presetStyle: { label },
  initialProps: ["id", "class", "for"],
  props,
};
