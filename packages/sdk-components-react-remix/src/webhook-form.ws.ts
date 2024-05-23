import { Form as baseMeta } from "@webstudio-is/sdk-components-react/metas";
import {
  type WsComponentMeta,
  type WsComponentPropsMeta,
  showAttribute,
} from "@webstudio-is/react-sdk";
import { props } from "./__generated__/webhook-form.props";
import { WebhookFormIcon } from "@webstudio-is/icons/svg";

export const meta: WsComponentMeta = {
  ...baseMeta,
  category: "data",
  label: "Webhook Form",
  description: "Collect user data and send it to any webhook.",
  order: 1,
  icon: WebhookFormIcon,
  states: [
    { selector: "[data-state=error]", label: "Error" },
    { selector: "[data-state=success]", label: "Success" },
  ],
  template: [
    {
      type: "instance",
      component: "Form",
      variables: {
        formState: { initialValue: "initial" },
      },
      props: [
        {
          type: "expression",
          name: "state",
          code: "formState",
        },
        {
          type: "action",
          name: "onStateChange",
          value: [
            { type: "execute", args: ["state"], code: `formState = state` },
          ],
        },
      ],
      children: [
        {
          type: "instance",
          label: "Form Content",
          component: "Box",
          props: [
            {
              type: "expression",
              name: showAttribute,
              code: "formState === 'initial' || formState === 'error'",
            },
          ],
          children: [
            {
              type: "instance",
              component: "Label",
              children: [{ type: "text", value: "Name", placeholder: true }],
            },
            {
              type: "instance",
              component: "Input",
              props: [{ type: "string", name: "name", value: "name" }],
              children: [],
            },
            {
              type: "instance",
              component: "Label",
              children: [{ type: "text", value: "Email", placeholder: true }],
            },
            {
              type: "instance",
              component: "Input",
              props: [{ type: "string", name: "name", value: "email" }],
              children: [],
            },
            {
              type: "instance",
              component: "Button",
              children: [{ type: "text", value: "Submit", placeholder: true }],
            },
          ],
        },

        {
          type: "instance",
          label: "Success Message",
          component: "Box",
          props: [
            {
              type: "expression",
              name: showAttribute,
              code: "formState === 'success'",
            },
          ],
          children: [
            {
              type: "text",
              value: "Thank you for getting in touch!",
              placeholder: true,
            },
          ],
        },

        {
          type: "instance",
          label: "Error Message",
          component: "Box",
          props: [
            {
              type: "expression",
              name: showAttribute,
              code: "formState === 'error'",
            },
          ],
          children: [
            {
              type: "text",
              value: "Sorry, something went wrong.",
              placeholder: true,
            },
          ],
        },
      ],
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "className", "state", "action"],
};
