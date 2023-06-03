import { PlayIcon, VimeoIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "./component-meta";
import { props } from "./__generated__/vimeo.props";
import { div } from "../css/normalize";
import { type WsVimeoOptions } from "./vimeo";
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
        property: "position",
        value: { type: "keyword", value: "relative" },
      },

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
            property: "position",
            value: { type: "keyword", value: "absolute" },
          },
          {
            property: "backgroundColor",
            value: { type: "keyword", value: "transparent" },
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
            label: "Play Icon",
            styles: [
              {
                property: "width",
                value: { type: "unit", value: 100, unit: "px" },
              },
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
                label: "Play SVG",
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

const initialProps: Array<keyof WsVimeoOptions> = [
  "url",
  "quality",
  "previewImage",
  "autoplay",
  "background",
  "doNotTrack",
  "loop",
  "muted",
  "portrait",
  "byline",
  "title",
  "controls",
  "color",
];

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps,
};
