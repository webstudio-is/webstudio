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
      dataSources: {
        formState: { type: "variable", initialValue: "initial" },
      },
      props: [
        {
          type: "dataSource",
          name: "state",
          dataSourceName: "formState",
        },
      ],
      children: [
        {
          type: "instance",
          label: "Form Content",
          component: "Box",
          dataSources: {
            formInitial: {
              type: "expression",
              code: `formState === 'initial' || formState === 'error'`,
            },
          },
          props: [
            {
              type: "dataSource",
              name: showAttribute,
              dataSourceName: "formInitial",
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
          dataSources: {
            formSuccess: {
              type: "expression",
              code: `formState === 'success'`,
            },
          },
          props: [
            {
              type: "dataSource",
              name: showAttribute,
              dataSourceName: "formSuccess",
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
          dataSources: {
            formError: {
              type: "expression",
              code: `formState === 'error'`,
            },
          },
          props: [
            {
              type: "dataSource",
              name: showAttribute,
              dataSourceName: "formError",
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
  initialProps: ["id", "state", "action"],
};
