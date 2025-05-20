import { PaintBrushIcon } from "@webstudio-is/icons/svg";
import { defaultStates, type WsComponentMeta } from "@webstudio-is/sdk";
import { span } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/span.props";

export const meta: WsComponentMeta = {
  label: "Text",
  icon: PaintBrushIcon,
  states: defaultStates,
  presetStyle: { span },
  initialProps: ["id", "class"],
  props,
};
