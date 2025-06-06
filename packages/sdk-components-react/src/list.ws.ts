import type { PresetStyle, WsComponentMeta } from "@webstudio-is/sdk";
import { ol, ul } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/list.props";
import type { ListTag } from "./list";

const presetStyle = {
  ol: [
    ...ol,
    {
      property: "margin-top",
      value: { type: "keyword", value: "0" },
    },
    {
      property: "margin-bottom",
      value: { type: "keyword", value: "10px" },
    },
    {
      property: "padding-left",
      value: { type: "keyword", value: "40px" },
    },
  ],
  ul: [
    ...ul,
    {
      property: "margin-top",
      value: { type: "keyword", value: "0" },
    },
    {
      property: "margin-bottom",
      value: { type: "keyword", value: "10px" },
    },
    {
      property: "padding-left",
      value: { type: "keyword", value: "40px" },
    },
  ],
} satisfies PresetStyle<ListTag>;

export const meta: WsComponentMeta = {
  presetStyle,
  initialProps: ["id", "class", "ordered", "start", "reversed"],
  props,
};
