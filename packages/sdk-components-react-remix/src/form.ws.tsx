import { FormIcon } from "@webstudio-is/icons/svg";
import { form } from "@webstudio-is/react-sdk/css-normalize";
import {
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
  showAttribute,
} from "@webstudio-is/react-sdk";
import type { defaultTag } from "./form";
import { props } from "./__generated__/form.props";

const presetStyle = {
  form: [
    ...form,
    { property: "minHeight", value: { type: "unit", unit: "px", value: 20 } },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "forms",
  type: "container",
  invalidAncestors: ["Form"],
  label: "Form",
  icon: FormIcon,
  presetStyle,
  order: 0,
  states: [
    { selector: "[data-state=error]", label: "Error" },
    { selector: "[data-state=success]", label: "Success" },
  ],
  template: [
    {
      type: "instance",
      component: "Form",
      props: [
        {
          name: "state",
          type: "string",
          value: "initial",
          dataSourceRef: {
            type: "variable",
            name: "formState",
          },
        },
      ],
      children: [
        {
          type: "instance",
          label: "Form Content",
          component: "Box",
          props: [
            {
              name: showAttribute,
              type: "boolean",
              value: false,
              dataSourceRef: {
                type: "expression",
                name: "formInitial",
                code: `formState === 'initial' || formState === 'error'`,
              },
            },
          ],
          children: [
            {
              type: "instance",
              component: "Label",
              children: [{ type: "text", value: "Name" }],
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
              children: [{ type: "text", value: "Email" }],
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
              children: [{ type: "text", value: "Submit" }],
            },
          ],
        },

        {
          type: "instance",
          label: "Success Message",
          component: "Box",
          props: [
            {
              name: showAttribute,
              type: "boolean",
              value: false,
              dataSourceRef: {
                type: "expression",
                name: "formSuccess",
                code: `formState === 'success'`,
              },
            },
          ],
          children: [
            { type: "text", value: "Thank you for getting in touch!" },
          ],
        },

        {
          type: "instance",
          label: "Error Message",
          component: "Box",
          props: [
            {
              name: showAttribute,
              type: "boolean",
              value: false,
              dataSourceRef: {
                type: "expression",
                name: "formError",
                code: `formState === 'error'`,
              },
            },
          ],
          children: [{ type: "text", value: "Sorry, something went wrong." }],
        },
      ],
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "state"],
};
