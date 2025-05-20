import { defaultStates, type WsComponentMeta } from "@webstudio-is/sdk";
import { b } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/bold.props";

export const meta: WsComponentMeta = {
  label: "Bold Text",
  states: defaultStates,
  presetStyle: { b },
  initialProps: ["id", "class"],
  props,
};
