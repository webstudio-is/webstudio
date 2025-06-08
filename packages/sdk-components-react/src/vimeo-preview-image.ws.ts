import type { WsComponentMeta } from "@webstudio-is/sdk";
import { meta as imageMeta } from "./image.ws";
import { props } from "./__generated__/vimeo-preview-image.props";

export const meta: WsComponentMeta = {
  ...imageMeta,
  category: "hidden",
  label: "Preview Image",
  contentModel: {
    category: "none",
    children: [],
  },
  initialProps: imageMeta.initialProps,
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
};
