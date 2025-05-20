import {
  CollapsibleIcon,
  TriggerIcon,
  ContentIcon,
} from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import { div } from "@webstudio-is/sdk/normalize.css";
import { radix } from "./shared/meta";
import {
  propsCollapsible,
  propsCollapsibleContent,
  propsCollapsibleTrigger,
} from "./__generated__/collapsible.props";

export const metaCollapsible: WsComponentMeta = {
  icon: CollapsibleIcon,
  contentModel: {
    category: "instance",
    children: ["instance"],
    descendants: [radix.CollapsibleTrigger, radix.CollapsibleContent],
  },
  presetStyle: {
    div,
  },
  initialProps: ["open"],
  props: propsCollapsible,
};

export const metaCollapsibleTrigger: WsComponentMeta = {
  icon: TriggerIcon,
  contentModel: {
    category: "none",
    children: ["instance", "rich-text"],
  },
  props: propsCollapsibleTrigger,
};

export const metaCollapsibleContent: WsComponentMeta = {
  icon: ContentIcon,
  contentModel: {
    category: "none",
    children: ["instance", "rich-text"],
  },
  presetStyle: {
    div,
  },
  props: propsCollapsibleContent,
};
