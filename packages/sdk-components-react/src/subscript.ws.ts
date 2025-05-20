import { defaultStates, type WsComponentMeta } from "@webstudio-is/sdk";
import { sub } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/subscript.props";

export const meta: WsComponentMeta = {
  label: "Subscript Text",
  states: defaultStates,
  presetStyle: { sub },
  initialProps: ["id", "class"],
  props,
};
