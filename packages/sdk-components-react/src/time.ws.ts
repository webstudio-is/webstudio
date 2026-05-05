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
  initialProps: [
    "datetime",
    "language",
    "country",
    "dateStyle",
    "timeStyle",
    "format",
  ],
  props: {
    ...props,
    datetime: {
      type: "string",
      control: "text",
      required: false,
      contentMode: true,
    },
    language: {
      ...props.language,
      contentMode: true,
    },
    country: {
      ...props.country,
      contentMode: true,
    },
    dateStyle: {
      ...props.dateStyle,
      contentMode: true,
    },
    timeStyle: {
      ...props.timeStyle,
      contentMode: true,
    },
    format: {
      ...props.format,
      contentMode: true,
    },
  },
};
