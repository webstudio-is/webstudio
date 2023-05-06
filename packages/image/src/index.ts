import type { PropMeta } from "@webstudio-is/generate-arg-types";
export { Image } from "./image";
export type { ImageLoader } from "./image-optimize";
export * as loaders from "./image-loaders";
import { props } from "./__generated__/image.props";

const getImageProps = (): Record<string, PropMeta> => {
  // "loader" is our internal prop not intended to show up in the props panel
  const { loader, ...publicProps } = props;

  return {
    ...publicProps,
    src: {
      type: "string",
      control: "file",
      label: "Source",
      required: false,
    },
  };
};

export const imageProps = /*#__PURE__*/ getImageProps();
