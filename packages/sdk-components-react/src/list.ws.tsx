import { ListIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type ComponentState,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { ol, ul } from "@webstudio-is/react-sdk/css-normalize";
import { props } from "./__generated__/list.props";
import { listStyleTypes, type ListTag } from "./list";

const stateStyles = listStyleTypes.map(
  (type) =>
    ({
      property: "listStyleType",
      value: { type: "keyword", value: type },
      state: type,
    }) as const
);

const presetStyle = {
  ol: [
    ...ol,
    ...stateStyles,
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
    ...stateStyles,
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

const moreStates: ComponentState[] = listStyleTypes.map((type) => ({
  selector: `[data-list-style-type="${type}"]`,
  label: type,
  state: type,
  category: "component-states-more",
}));

export const meta: WsComponentMeta = {
  category: "general",
  type: "container",
  label: "List",
  icon: ListIcon,
  states: [...defaultStates, ...moreStates],
  presetStyle,
  order: 3,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "ordered", "listStyleType", "start", "reversed"],
};
