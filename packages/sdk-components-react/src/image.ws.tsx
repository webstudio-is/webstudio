import { ImageIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { img } from "@webstudio-is/react-sdk/css-normalize";
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
  order: 0,
};

// Automatically generated props don't have the right control.
export const propsOverrides = {
  src: {
    type: "string",
    control: "file",
    label: "Source",
    required: false,
  },
} as const;

export const propsMeta: WsComponentPropsMeta = {
  props: {
    ...props,
    ...propsOverrides,
  },
  initialProps: ["id", "src", "width", "height", "alt", "loading"],
};
