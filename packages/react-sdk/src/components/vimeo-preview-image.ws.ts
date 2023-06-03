import { ImageIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "./component-meta";
import { propsMeta as imagePropsMeta } from "./image.ws";
import { props } from "./__generated__/vimeo-preview-image.props";
import { img } from "../css/normalize";

const presetStyle = {
  img,
} satisfies PresetStyle<"img">;

export const meta: WsComponentMeta = {
  type: "embed",
  label: "Preview Image",
  icon: ImageIcon,
  states: defaultStates,
  presetStyle,
  requiredAncestors: ["Vimeo"],
  template: [
    {
      type: "instance",
      component: "Image",
      label: "Preview Image",
      styles: [
        {
          property: "position",
          value: { type: "keyword", value: "absolute" },
        },
        {
          property: "objectPosition",
          value: { type: "keyword", value: "cover" },
        },
        {
          property: "width",
          value: { type: "unit", value: 100, unit: "%" },
        },
        {
          property: "height",
          value: { type: "unit", value: 100, unit: "%" },
        },
      ],
      children: [],
      props: [
        {
          type: "string",
          name: "src",
          // @todo display control just like with an asset with reset button
          // Generated using https://png-pixel.com/
          value:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkqAcAAIUAgUW0RjgAAAAASUVORK5CYII=",
        },
      ],
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props: { ...props, ...imagePropsMeta.props },
  initialProps: imagePropsMeta.initialProps,
};
