import type { WsComponentMeta, WsComponentPropsMeta } from "@webstudio-is/sdk";
import { propsMeta as imagePropsMeta, meta as imageMeta } from "./image.ws";
import { props } from "./__generated__/vimeo-preview-image.props";

export const meta: WsComponentMeta = {
  ...imageMeta,
  category: "hidden",
  label: "Preview Image",
  constraints: {
    relation: "ancestor",
    component: { $in: ["Vimeo", "YouTube"] },
  },
};

export const propsMeta: WsComponentPropsMeta = {
  props: {
    ...props,
    // Automatically generated props don't have the right control.
    src: {
      type: "string",
      control: "file",
      label: "Source",
      required: false,
    },
  },
  initialProps: imagePropsMeta.initialProps,
};
