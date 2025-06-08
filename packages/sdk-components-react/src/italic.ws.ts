import type { WsComponentMeta } from "@webstudio-is/sdk";
import { i } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/italic.props";

export const meta: WsComponentMeta = {
  label: "Italic Text",
  presetStyle: { i },
  initialProps: ["id", "class"],
  props,
};
