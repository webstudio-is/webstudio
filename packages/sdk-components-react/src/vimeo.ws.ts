import { PlayIcon, SpinnerIcon, VimeoIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { div } from "@webstudio-is/react-sdk/css-normalize";
import { props } from "./__generated__/vimeo.props";
import { type VimeoOptions } from "./vimeo";

const presetStyle = {
  div,
} satisfies PresetStyle<"div">;

export const meta: WsComponentMeta = {
  category: "media",
  type: "container",
  label: "Vimeo",
  order: 1,
  icon: VimeoIcon,
  states: defaultStates,
  presetStyle,
  template: [
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
          component: "VimeoPreviewImage",
          styles: [
            {
              property: "position",
              value: { type: "keyword", value: "absolute" },
            },
            {
              property: "objectFit",
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
            {
              property: "borderTopLeftRadius",
              value: { type: "unit", value: 20, unit: "px" },
            },
            {
              property: "borderTopRightRadius",
              value: { type: "unit", value: 20, unit: "px" },
            },
            {
              property: "borderBottomLeftRadius",
              value: { type: "unit", value: 20, unit: "px" },
            },
            {
              property: "borderBottomRightRadius",
              value: { type: "unit", value: 20, unit: "px" },
            },
            {
              property: "objectPosition",
              value: { type: "keyword", value: "cover" },
            },
          ],
          children: [],
          props: [
            {
              type: "string",
              name: "alt",
              value: "Vimeo video preview image",
            },
            {
              type: "string",
              name: "sizes",
              value: "100vw",
            },
          ],
        },
        {
          type: "instance",
          component: "Box",
          label: "Spinner",
          styles: [
            {
              property: "position",
              value: { type: "keyword", value: "absolute" },
            },
            {
              property: "top",
              value: { type: "unit", value: 50, unit: "%" },
            },
            {
              property: "left",
              value: { type: "unit", value: 50, unit: "%" },
            },
            {
              property: "width",
              value: { type: "unit", value: 70, unit: "px" },
            },
            {
              property: "height",
              value: { type: "unit", value: 70, unit: "px" },
            },
            {
              property: "marginTop",
              value: { type: "unit", value: -35, unit: "px" },
            },
            {
              property: "marginLeft",
              value: { type: "unit", value: -35, unit: "px" },
            },
          ],
          children: [
            {
              type: "instance",
              component: "HtmlEmbed",
              label: "Spinner SVG",
              props: [
                {
                  type: "string",
                  name: "code",
                  value: SpinnerIcon,
                },
              ],
              children: [],
            },
          ],
        },
        {
          type: "instance",
          component: "VimeoPlayButton",
          props: [
            {
              type: "string",
              name: "aria-label",
              value: "Play button",
            },
          ],
          styles: [
            {
              property: "position",
              value: { type: "keyword", value: "absolute" },
            },
            {
              property: "width",
              value: { type: "unit", value: 140, unit: "px" },
            },
            {
              property: "height",
              value: { type: "unit", value: 80, unit: "px" },
            },
            {
              property: "top",
              value: { type: "unit", value: 50, unit: "%" },
            },
            {
              property: "left",
              value: { type: "unit", value: 50, unit: "%" },
            },
            {
              property: "marginTop",
              value: { type: "unit", value: -40, unit: "px" },
            },
            {
              property: "marginLeft",
              value: { type: "unit", value: -70, unit: "px" },
            },
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
              property: "borderTopStyle",
              value: { type: "keyword", value: "none" },
            },
            {
              property: "borderRightStyle",
              value: { type: "keyword", value: "none" },
            },
            {
              property: "borderBottomStyle",
              value: { type: "keyword", value: "none" },
            },
            {
              property: "borderLeftStyle",
              value: { type: "keyword", value: "none" },
            },
            {
              property: "borderTopLeftRadius",
              value: { type: "unit", value: 5, unit: "px" },
            },
            {
              property: "borderTopRightRadius",
              value: { type: "unit", value: 5, unit: "px" },
            },
            {
              property: "borderBottomLeftRadius",
              value: { type: "unit", value: 5, unit: "px" },
            },
            {
              property: "borderBottomRightRadius",
              value: { type: "unit", value: 5, unit: "px" },
            },
            {
              property: "cursor",
              value: { type: "keyword", value: "pointer" },
            },
            {
              property: "backgroundColor",
              value: {
                type: "rgb",
                r: 18,
                g: 18,
                b: 18,
                alpha: 1,
              },
            },
            {
              property: "color",
              value: {
                type: "rgb",
                r: 255,
                g: 255,
                b: 255,
                alpha: 1,
              },
            },
            {
              state: ":hover",
              property: "backgroundColor",
              value: {
                type: "rgb",
                r: 0,
                g: 173,
                b: 239,
                alpha: 1,
              },
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
                  value: { type: "unit", value: 60, unit: "px" },
                },
                {
                  property: "height",
                  value: { type: "unit", value: 60, unit: "px" },
                },
              ],
              props: [
                {
                  type: "string",
                  name: "aria-hidden",
                  value: "true",
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
  ],
};

const initialProps: Array<keyof VimeoOptions> = [
  "url",
  "quality",
  "showPreview",
  "autoplay",
  "backgroundMode",
  "doNotTrack",
  "loop",
  "muted",
  "showPortrait",
  "showByline",
  "showTitle",
  "showControls",
  "controlsColor",
];

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps,
};
