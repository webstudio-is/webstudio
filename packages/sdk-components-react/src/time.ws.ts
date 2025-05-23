import type { WsComponentMeta } from "@webstudio-is/sdk";
import { time } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/time.props";

export const meta: WsComponentMeta = {
  category: "localization",
  description:
    "Converts machine-readable date and time to a human-readable format.",
  contentModel: {
    category: "instance",
    children: [],
  },
  presetStyle: {
    time,
  },
  initialProps: ["datetime", "language", "country", "dateStyle", "timeStyle"],
  props,
};
