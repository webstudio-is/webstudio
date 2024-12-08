import {
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import {
  propsOverrides as imagePropsOverrides,
  propsMeta as imagePropsMeta,
  meta as imageMeta,
} from "./image.ws";
import { props } from "./__generated__/vimeo-preview-image.props";

export const meta: WsComponentMeta = {
  ...imageMeta,
  category: "hidden",
  label: "Preview Image",
  constraints: {
    relation: "ancestor",
    component: { $eq: "Vimeo" },
  },
};

export const propsMeta: WsComponentPropsMeta = {
  props: { ...props, ...imagePropsOverrides },
  initialProps: imagePropsMeta.initialProps,
};
