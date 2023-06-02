import { PlayIcon, VimeoIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "./component-meta";
import { props } from "./__generated__/vimeo.props";
import { div } from "../css/normalize";
import { type VimeoPlayerOptions } from "./vimeo";
import type { WsEmbedTemplate } from "..";

const presetStyle = {
  div,
} satisfies PresetStyle<"div">;

const template: WsEmbedTemplate = [
  {
    type: "instance",
    component: "Vimeo",
    styles: [
      {
        property: "aspectRatio",
        value: { type: "keyword", value: "640/360" },
      },
      {
        property: "width",
        value: { type: "unit", value: 100, unit: "%" },
      },
    ],
    children: [
      {
        type: "instance",
        component: "Button",
        label: "Play Button",
        styles: [
          {
            property: "display",
            value: { type: "keyword", value: "flex" },
          },
          {
            property: "alignItems",
            value: { type: "keyword", value: "center" },
          },
          {
            property: "justifyContent",
            value: { type: "keyword", value: "center" },
          },
          {
            property: "flexGrow",
            value: { type: "keyword", value: "1" },
          },
          {
            property: "cursor",
            value: { type: "keyword", value: "pointer" },
          },
          {
            property: "width",
            value: { type: "unit", value: 100, unit: "%" },
          },
          {
            property: "height",
            value: { type: "unit", value: 100, unit: "%" },
          },
          {
            state: ":hover",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
        ],
        children: [
          {
            type: "instance",
            component: "Box",
            label: "Icon",
            styles: [
              {
                property: "width",
                value: { type: "unit", value: 100, unit: "px" },
              },
              {
                property: "height",
                value: { type: "unit", value: 100, unit: "px" },
              },
            ],
            children: [
              {
                type: "instance",
                component: "HtmlEmbed",
                label: "SVG",
                props: [
                  {
                    type: "string",
                    name: "code",
                    value: PlayIcon,
                  },
                ],
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
];

export const meta: WsComponentMeta = {
  category: "media",
  type: "container",
  label: "Vimeo",
  order: 1,
  icon: VimeoIcon,
  states: defaultStates,
  presetStyle,
  template,
};

const initialProps: Array<keyof VimeoPlayerOptions> = [
  "url",
  "quality",
  "autoplay",
  "controls",
  "background",
  "doNotTrack",
  "loop",
  "muted",
  "portrait",
  "title",
  "keyboard",
  "color",
];

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps,
};
