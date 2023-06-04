import {
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { propsMeta as buttonPropsMeta, meta as buttonMeta } from "./button.ws";
import { props } from "./__generated__/vimeo-play-button.props";

export const meta: WsComponentMeta = {
  ...buttonMeta,
  category: "hidden",
  label: "Play Button",
  requiredAncestors: ["Vimeo"],
};

export const propsMeta: WsComponentPropsMeta = {
  props: { ...props, ...buttonPropsMeta.props },
  initialProps: buttonPropsMeta.initialProps,
};
