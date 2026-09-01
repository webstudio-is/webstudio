import { AlertIcon } from "@webstudio-is/icons/svg";
import { descendantComponent, type WsComponentMeta } from "@webstudio-is/sdk";
import { props } from "./__generated__/alert.props";

export const meta: WsComponentMeta = {
  icon: AlertIcon,
  description: "Highlight a note, tip, important detail, warning, or caution.",
  contentModel: {
    category: "instance",
    children: ["instance", descendantComponent],
  },
  initialProps: ["variant", "id", "class"],
  props: {
    ...props,
    variant: {
      label: "Variant",
      required: false,
      control: "select",
      type: "string",
      contentMode: true,
      defaultValue: "note",
      options: ["note", "tip", "important", "warning", "caution"],
    },
  },
};
