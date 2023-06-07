import {
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { propsMeta as boxPropsMeta, meta as boxMeta } from "./box.ws";
import { props } from "./__generated__/vimeo-spinner.props";

export const meta: WsComponentMeta = {
  ...boxMeta,
  category: "hidden",
  label: "Spinner",
  requiredAncestors: ["Vimeo"],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: boxPropsMeta.initialProps,
};
