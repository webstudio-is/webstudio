import type { WsComponentMeta } from "@webstudio-is/sdk";
import { body } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/body.props";

export const meta: WsComponentMeta = {
  presetStyle: { body },
  initialProps: ["id", "class"],
  props,
};
