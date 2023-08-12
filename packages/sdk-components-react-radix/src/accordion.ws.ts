import {
  AccordionIcon,
  ItemIcon,
  HeaderIcon,
  TriggerIcon,
  ContentIcon,
} from "@webstudio-is/icons/svg";
import type {
  EmbedTemplateStyleDecl,
  PresetStyle,
  WsComponentMeta,
  WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { div, h3, button } from "@webstudio-is/react-sdk/css-normalize";
import * as tc from "./theme/tailwind-classes";
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

/**
 * Styles source without animations:
 * https://github.com/shadcn-ui/ui/blob/main/apps/www/registry/default/ui/accordion.tsx
 *
 * Attributions
 * MIT License
 * Copyright (c) 2023 shadcn
 **/

// border-b
const accordionItemStyles: EmbedTemplateStyleDecl[] = [tc.borderB()].flat();

// flex
const accordionHeaderStyles: EmbedTemplateStyleDecl[] = [tc.flex()].flat();

// flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180
const accordionTriggerStyles: EmbedTemplateStyleDecl[] = [
  tc.flex(),
  tc.flex(1),
  tc.items("center"),
  tc.justify("between"),
  tc.py(4),
  tc.font("medium"),
  tc.transition("all"),
  tc.hover([tc.underline()].flat()),
].flat();

// overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down
// pb-4 pt-0
const accordionContentStyles: EmbedTemplateStyleDecl[] = [
  tc.overflow("hidden"),
  tc.text("sm"),
  // transition does not work with display: none
  // tc.transition("all"),
  tc.pb(4),
].flat();

export const metaAccordion: WsComponentMeta = {
  category: "radix",
  type: "container",
  label: "Accordion",
  icon: AccordionIcon,
  presetStyle,
  template: [
    {
      type: "instance",
      component: "Accordion",
      dataSources: {
        accordionValue: { type: "variable", initialValue: "0" },
      },
      props: [
        { type: "boolean", name: "collapsible", value: true },
        { type: "dataSource", name: "value", dataSourceName: "accordionValue" },
        {
          name: "onValueChange",
          type: "action",
          value: [
            {
              type: "execute",
              args: ["value"],
              code: `accordionValue = value`,
            },
          ],
        },
      ],
      children: [
        {
          type: "instance",
          component: "AccordionItem",
          styles: accordionItemStyles,
          children: [
            {
              type: "instance",
              component: "AccordionHeader",
              styles: accordionHeaderStyles,
              children: [
                {
                  type: "instance",
                  component: "AccordionTrigger",
                  styles: accordionTriggerStyles,
                  children: [{ type: "text", value: "Is it accessible?" }],
                },
              ],
            },
            {
              type: "instance",
              component: "AccordionContent",
              styles: accordionContentStyles,
              children: [
                {
                  type: "text",
                  value: "Yes. It adheres to the WAI-ARIA design pattern.",
                },
              ],
            },
          ],
        },

        {
          type: "instance",
          component: "AccordionItem",
          styles: accordionItemStyles,
          children: [
            {
              type: "instance",
              component: "AccordionHeader",
              styles: accordionHeaderStyles,
              children: [
                {
                  type: "instance",
                  component: "AccordionTrigger",
                  styles: accordionTriggerStyles,
                  children: [{ type: "text", value: "Is it styled?" }],
                },
              ],
            },
            {
              type: "instance",
              component: "AccordionContent",
              styles: accordionContentStyles,
              children: [
                {
                  type: "text",
                  value:
                    "Yes. It comes with default styles that matches the other components' aesthetic.",
                },
              ],
            },
          ],
        },

        {
          type: "instance",
          component: "AccordionItem",
          styles: accordionItemStyles,
          children: [
            {
              type: "instance",
              component: "AccordionHeader",
              styles: accordionHeaderStyles,
              children: [
                {
                  type: "instance",
                  component: "AccordionTrigger",
                  styles: accordionTriggerStyles,
                  children: [{ type: "text", value: "Is it animated?" }],
                },
              ],
            },
            {
              type: "instance",
              component: "AccordionContent",
              styles: accordionContentStyles,
              children: [
                {
                  type: "text",
                  value:
                    "Yes. It's animated by default, but you can disable it if you prefer.",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const metaAccordionItem: WsComponentMeta = {
  category: "hidden",
  type: "container",
  label: "Accordion Item",
  icon: ItemIcon,
  requiredAncestors: ["Accordion"],
  indexWithinAncestor: "Accordion",
  presetStyle,
};

export const metaAccordionHeader: WsComponentMeta = {
  category: "hidden",
  type: "container",
  label: "Accordion Header",
  icon: HeaderIcon,
  requiredAncestors: ["AccordionItem"],
  detachable: false,
  presetStyle: {
    h3: [h3, tc.my(0)].flat(),
  },
};

export const metaAccordionTrigger: WsComponentMeta = {
  category: "hidden",
  type: "container",
  label: "Accordion Trigger",
  icon: TriggerIcon,
  requiredAncestors: ["AccordionHeader"],
  detachable: false,
  presetStyle: {
    button: [
      button,
      {
        property: "backgroundColor",
        value: { type: "keyword", value: "transparent" },
      } as const,
      {
        property: "backgroundImage",
        value: { type: "keyword", value: "none" },
      } as const,
      {
        property: "cursor",
        value: { type: "keyword", value: "pointer" },
      } as const,
      tc.px(0),
      tc.border(0),
    ].flat(),
  },
};

export const metaAccordionContent: WsComponentMeta = {
  category: "hidden",
  type: "container",
  label: "Accordion Content",
  icon: ContentIcon,
  requiredAncestors: ["AccordionItem"],
  detachable: false,
  presetStyle,
};

export const propsMetaAccordion: WsComponentPropsMeta = {
  props: propsAccordion,
  initialProps: ["value", "collapsible", "dir", "orientation"],
};

export const propsMetaAccordionItem: WsComponentPropsMeta = {
  props: propsAccordionItem,
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
