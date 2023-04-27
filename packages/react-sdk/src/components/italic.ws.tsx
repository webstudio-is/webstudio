import { TextItalicIcon } from "@webstudio-is/icons";
import type { defaultTag } from "./italic";
import type {
  PresetStyle,
  WsComponentMeta,
  WsComponentPropsMeta,
} from "./component-meta";
import { props } from "./__generated__/italic.props";
import { i } from "../css/normalize";

const presetStyle = {
  i: [
    ...i,
    {
      property: "fontStyle",
      value: { type: "keyword", value: "italic" },
    },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  type: "rich-text-child",
  label: "Italic Text",
  Icon: TextItalicIcon,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
