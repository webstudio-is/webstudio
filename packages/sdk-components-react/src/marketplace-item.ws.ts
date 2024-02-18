import { BoxIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";

export const meta: WsComponentMeta = {
  category: "utilities",
  type: "container",
  label: "Marketplace Item",
  description:
    "A container to wrap every marketplace item with, so that it can be copied and inserted",
  icon: BoxIcon,
  states: defaultStates,
  stylable: false,
};

export const propsMeta: WsComponentPropsMeta = {
  props: {},
};
