import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { form } from "@webstudio-is/react-sdk/css-normalize";
import type { defaultTag } from "./remix-form";
import { FormIcon } from "@webstudio-is/icons/svg";
import { props } from "./__generated__/remix-form.props";

const presetStyle = {
  form,
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "forms",
  type: "container",
  invalidAncestors: ["Form", "Button", "Link"],
  label: "Form",
  description: "Form control.",
  icon: FormIcon,
  states: defaultStates,
  presetStyle,
  order: 0,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "className"],
};
