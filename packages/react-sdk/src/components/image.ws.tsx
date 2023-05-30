import { ImageIcon } from "@webstudio-is/icons/svg";
import { img } from "../css/normalize";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "./component-meta";
import type { defaultTag } from "./image";
import { props } from "./__generated__/image.props";

const presetStyle = {
  img: [
    ...img,

    // Otherwise on new image insert onto canvas it can overfit screen size multiple times
    {
      property: "maxWidth",
      value: { type: "unit", unit: "%", value: 100 },
    },
    // inline | inline-block is not suitable because without line-height: 0 on the parent you get unsuitable spaces/margins
    // see https://stackoverflow.com/questions/24771194/is-the-margin-of-inline-block-4px-is-static-for-all-browsers
    {
      property: "display",
      value: { type: "keyword", value: "block" },
    },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "media",
  type: "embed",
  label: "Image",
  icon: ImageIcon,
  states: defaultStates,
  presetStyle,
};

// "loader" is our internal prop not intended to show up in the props panel
const { loader, ...publicProps } = props;

export const propsMeta: WsComponentPropsMeta = {
  props: {
    ...publicProps,
    src: {
      type: "string",
      control: "file",
      label: "Source",
      required: false,
    },
  },
  initialProps: ["src", "width", "height", "alt", "loading"],
};
