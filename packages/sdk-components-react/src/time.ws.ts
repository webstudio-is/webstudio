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
    "timeZone",
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
    timeZone: {
      required: false,
      control: "timeZone",
      type: "string",
      defaultValue: "UTC",
      options: ["UTC", "visitor"],
      description:
        'Timezone used to display the date. Use "visitor" to display each visitor’s browser timezone after the page loads, or select/type an IANA timezone like "Europe/Berlin".',
      contentMode: true,
    },
    format: {
      ...props.format,
      contentMode: true,
    },
  },
};
