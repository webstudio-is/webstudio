import { WebhookFormIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta, WsComponentPropsMeta } from "@webstudio-is/sdk";
import { form } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/webhook-form.props";

export const meta: WsComponentMeta = {
  label: "Webhook Form",
  icon: WebhookFormIcon,
  type: "container",
  constraints: {
    relation: "ancestor",
    component: { $nin: ["Form", "Button", "Link"] },
  },
  presetStyle: {
    form,
  },
  states: [
    { selector: "[data-state=error]", label: "Error" },
    { selector: "[data-state=success]", label: "Success" },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "className", "state", "action"],
};
