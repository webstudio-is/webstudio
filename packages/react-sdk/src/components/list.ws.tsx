import { ListIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "./component-meta";
import { props } from "./__generated__/list.props";
import type { ListTag } from "./list";
import { ol, ul } from "../css/normalize";

const presetStyle = {
  ol: [
    ...ol,
    {
      property: "marginTop",
      value: { type: "keyword", value: "0" },
    },
    {
      property: "marginBottom",
      value: { type: "keyword", value: "10px" },
    },
    {
      property: "paddingLeft",
      value: { type: "keyword", value: "40px" },
    },
  ],
  ul: [
    ...ul,
    {
      property: "marginTop",
      value: { type: "keyword", value: "0" },
    },
    {
      property: "marginBottom",
      value: { type: "keyword", value: "10px" },
    },
    {
      property: "paddingLeft",
      value: { type: "keyword", value: "40px" },
    },
  ],
} satisfies PresetStyle<ListTag>;

export const meta: WsComponentMeta = {
  category: "typography",
  type: "container",
  label: "List",
  icon: ListIcon,
  states: defaultStates,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["ordered", "type", "starts", "reversed"],
};
