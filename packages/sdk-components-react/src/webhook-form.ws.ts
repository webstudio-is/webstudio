import { WebhookFormIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import { form } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/webhook-form.props";

export const meta: WsComponentMeta = {
  label: "Webhook Form",
  icon: WebhookFormIcon,
  presetStyle: {
    form,
  },
  states: [
    { selector: "[data-state=error]", label: "Error" },
    { selector: "[data-state=success]", label: "Success" },
  ],
  initialProps: ["id", "class", "state", "action"],
  props: {
    ...props,
    action: {
      type: "resource",
      control: "resource",
      description:
        "The URI of a program that processes the information submitted via the form.",
      required: false,
    },
  },
};
