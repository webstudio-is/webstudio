import {
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "./component-meta";
import { propsMeta as buttonPropsMeta, meta as buttonMeta } from "./button.ws";
import { props } from "./__generated__/vimeo-play-button.props";

export const meta: WsComponentMeta = {
  ...buttonMeta,
  category: undefined,
  label: "Play Button",
  requiredAncestors: ["Vimeo"],
};

export const propsMeta: WsComponentPropsMeta = {
  props: { ...props, ...buttonPropsMeta.props },
  initialProps: buttonPropsMeta.initialProps,
};
