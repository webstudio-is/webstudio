import { ImageIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-type";
import { props } from "./__generated__/image.props";

const presetStyle = {
  // Otherwise on new image insert onto canvas it can overfit screen size multiple times
  maxWidth: {
    type: "unit",
    unit: "%",
    value: 100,
  },
  // inline | inline-block is not suitable because without line-height: 0 on the parent you get unsuitable spaces/margins
  // see https://stackoverflow.com/questions/24771194/is-the-margin-of-inline-block-4px-is-static-for-all-browsers
  display: {
    type: "keyword",
    value: "block",
  },
} as const;

export const meta: WsComponentMeta = {
  type: "embed",
  label: "Image",
  Icon: ImageIcon,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props: {
    ...props,
    src: {
      type: "string",
      control: "file-image",
      label: "Source",
      required: false,
    },
  },
  initialProps: ["src", "width", "height", "alt", "loading"],
};
