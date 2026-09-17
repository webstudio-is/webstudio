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
  states: [
    { label: "Note", selector: '[data-state="note"]' },
    { label: "Tip", selector: '[data-state="tip"]' },
    { label: "Important", selector: '[data-state="important"]' },
    { label: "Warning", selector: '[data-state="warning"]' },
    { label: "Caution", selector: '[data-state="caution"]' },
  ],
  initialProps: ["variant", "id", "class"],
  props: {
    ...props,
    variant: {
      ...props.variant,
      label: "Variant",
      contentMode: true,
    },
  },
};
