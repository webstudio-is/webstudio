import type { WsComponentMeta } from "@webstudio-is/sdk";
import { button } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/button.props";

export const meta: WsComponentMeta = {
  presetStyle: { button },
  initialProps: ["id", "class", "type", "aria-label"],
  props,
};
