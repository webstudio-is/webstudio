import {
  AccordionIcon,
  ItemIcon,
  HeaderIcon,
  TriggerIcon,
  ContentIcon,
} from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";
import { div, h3, button } from "@webstudio-is/sdk/normalize.css";
import { buttonReset } from "./shared/preset-styles";
import {
  propsAccordion,
  propsAccordionItem,
  propsAccordionHeader,
  propsAccordionTrigger,
  propsAccordionContent,
} from "./__generated__/accordion.props";

const presetStyle = {
  div,
} satisfies PresetStyle<"div">;

export const metaAccordion: WsComponentMeta = {
  type: "container",
  icon: AccordionIcon,
  presetStyle,
  constraints: [
    {
      relation: "descendant",
      component: { $eq: "AccordionItem" },
    },
  ],
};

export const metaAccordionItem: WsComponentMeta = {
  type: "container",
  label: "Item",
  icon: ItemIcon,
  constraints: [
    {
      relation: "ancestor",
      component: { $eq: "Accordion" },
    },
    {
      relation: "descendant",
      component: { $eq: "AccordionHeader" },
    },
    {
      relation: "descendant",
      component: { $eq: "AccordionContent" },
    },
  ],
  indexWithinAncestor: "Accordion",
  presetStyle,
};

export const metaAccordionHeader: WsComponentMeta = {
  type: "container",
  label: "Item Header",
  icon: HeaderIcon,
  constraints: [
    {
      relation: "ancestor",
      component: { $eq: "AccordionItem" },
    },
    {
      relation: "descendant",
      component: { $eq: "AccordionTrigger" },
    },
  ],
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
};

export const metaAccordionTrigger: WsComponentMeta = {
  type: "container",
  label: "Item Trigger",
  icon: TriggerIcon,
  constraints: {
    relation: "ancestor",
    component: { $eq: "AccordionHeader" },
  },
  states: [
    ...defaultStates,
    {
      category: "component-states",
      label: "Open",
      selector: "[data-state=open]",
    },
  ],
  presetStyle: {
    button: [button, buttonReset].flat(),
  },
};

export const metaAccordionContent: WsComponentMeta = {
  type: "container",
  label: "Item Content",
  icon: ContentIcon,
  constraints: {
    relation: "ancestor",
    component: { $eq: "AccordionItem" },
  },
  presetStyle,
};

export const propsMetaAccordion: WsComponentPropsMeta = {
  props: propsAccordion,
  initialProps: ["value", "collapsible"],
};

export const propsMetaAccordionItem: WsComponentPropsMeta = {
  props: propsAccordionItem,
  initialProps: ["value"],
};

export const propsMetaAccordionHeader: WsComponentPropsMeta = {
  props: propsAccordionHeader,
};

export const propsMetaAccordionTrigger: WsComponentPropsMeta = {
  props: propsAccordionTrigger,
};

export const propsMetaAccordionContent: WsComponentPropsMeta = {
  props: propsAccordionContent,
};
