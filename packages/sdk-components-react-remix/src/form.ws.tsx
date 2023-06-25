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

const stateRef = `stateRef`;
const initialRef = `initialRef`;
const successRef = `successRef`;
const errorRef = `errorRef`;

export const meta: WsComponentMeta = {
  category: "forms",
  type: "container",
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
          dataSourceRef: stateRef,
          value: "initial",
        },
        {
          name: "initial",
          type: "boolean",
          dataSourceRef: initialRef,
          value: true,
        },
        {
          name: "success",
          type: "boolean",
          dataSourceRef: successRef,
          value: false,
        },
        {
          name: "error",
          type: "boolean",
          dataSourceRef: errorRef,
          value: false,
        },
        {
          name: showAttribute,
          type: "boolean",
          dataSourceRef: initialRef,
          value: false,
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
      label: "SuccessMessage",
      component: "Box",
      props: [
        {
          name: showAttribute,
          type: "boolean",
          dataSourceRef: successRef,
          value: false,
        },
      ],
      children: [{ type: "text", value: "Thank you for getting in touch!" }],
    },
    {
      type: "instance",
      label: "ErrorMessage",
      component: "Box",
      props: [
        {
          name: showAttribute,
          type: "boolean",
          dataSourceRef: errorRef,
          value: false,
        },
      ],
      children: [{ type: "text", value: "Sorry, something went wrong." }],
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["state", "initial", "success", "error", "initialState"],
};
