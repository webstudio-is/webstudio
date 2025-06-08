import {
  AccordionIcon,
  ItemIcon,
  HeaderIcon,
  TriggerIcon,
  ContentIcon,
} from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import { div, h3, button } from "@webstudio-is/sdk/normalize.css";
import { radix } from "./shared/meta";
import { buttonReset } from "./shared/preset-styles";
import {
  propsAccordion,
  propsAccordionItem,
  propsAccordionHeader,
  propsAccordionTrigger,
  propsAccordionContent,
} from "./__generated__/accordion.props";

export const metaAccordion: WsComponentMeta = {
  icon: AccordionIcon,
  contentModel: {
    category: "instance",
    children: ["instance"],
    descendants: [radix.AccordionItem],
  },
  presetStyle: { div },
  initialProps: ["value", "collapsible"],
  props: propsAccordion,
};

export const metaAccordionItem: WsComponentMeta = {
  label: "Item",
  icon: ItemIcon,
  indexWithinAncestor: radix.Accordion,
  contentModel: {
    category: "none",
    children: ["instance"],
    descendants: [radix.AccordionHeader, radix.AccordionContent],
  },
  presetStyle: { div },
  initialProps: ["value"],
  props: propsAccordionItem,
};

export const metaAccordionHeader: WsComponentMeta = {
  label: "Item Header",
  icon: HeaderIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
    descendants: [radix.AccordionTrigger],
  },
  presetStyle: {
    h3: [
      ...h3,
      {
        property: "margin-top",
        value: { type: "unit", unit: "px", value: 0 },
      },
      {
        property: "margin-bottom",
        value: { type: "unit", unit: "px", value: 0 },
      },
    ],
  },
  props: propsAccordionHeader,
};

export const metaAccordionTrigger: WsComponentMeta = {
  label: "Item Trigger",
  icon: TriggerIcon,
  contentModel: {
    category: "none",
    children: ["instance", "rich-text"],
  },
  states: [{ label: "Open", selector: "[data-state=open]" }],
  presetStyle: {
    button: [button, buttonReset].flat(),
  },
  props: propsAccordionTrigger,
};

export const metaAccordionContent: WsComponentMeta = {
  label: "Item Content",
  icon: ContentIcon,
  contentModel: {
    category: "none",
    children: ["instance", "rich-text"],
  },
  presetStyle: {
    div,
  },
  props: propsAccordionContent,
};
