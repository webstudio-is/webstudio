import type { PropMeta } from "@webstudio-is/generate-arg-types";
export { Image } from "./image";
export type { ImageLoader } from "./image-optimize";
export * from "./image-loaders";
import { props } from "./__generated__/image.props";

// "loader" is our internal prop not intended to show up in the props panel
const { loader, ...publicProps } = props;

export const imageProps: Record<string, PropMeta> = {
  ...publicProps,
  src: {
    type: "string",
    control: "file",
    label: "Source",
    required: false,
  },
};
