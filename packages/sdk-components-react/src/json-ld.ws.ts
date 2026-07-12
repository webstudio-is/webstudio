import { JsonLdIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import { props } from "./__generated__/json-ld.props";

export const meta: WsComponentMeta = {
  category: "general",
  label: "JSON-LD",
  description:
    "Adds JSON-LD structured data from a JSON object or array. Prefer placing it inside Head Slot.",
  icon: JsonLdIcon,
  order: 6,
  contentModel: {
    category: "instance",
    children: [],
  },
  initialProps: ["code"],
  props: {
    ...props,
    code: {
      required: true,
      control: "json-code",
      type: "string",
    },
  },
};
