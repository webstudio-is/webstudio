import {
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "./component-meta";
import { propsMeta as imagePropsMeta, meta as imageMeta } from "./image.ws";
import { props } from "./__generated__/vimeo-preview-image.props";

export const meta: WsComponentMeta = {
  ...imageMeta,
  category: undefined,
  label: "Preview Image",
  requiredAncestors: ["Vimeo"],
};

export const propsMeta: WsComponentPropsMeta = {
  props: { ...props, ...imagePropsMeta.props },
  initialProps: imagePropsMeta.initialProps,
};
