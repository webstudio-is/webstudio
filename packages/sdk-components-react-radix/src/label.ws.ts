import { LabelIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";
import { label } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/label.props";

export const meta: WsComponentMeta = {
  icon: LabelIcon,
  states: defaultStates,
  presetStyle: {
    label,
  },
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "className", "htmlFor"],
};
