import {
  DialogIcon,
  TriggerIcon,
  ContentIcon,
  OverlayIcon,
  HeadingIcon,
  TextIcon,
  ButtonElementIcon,
  LargeXIcon,
} from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { div, button, h2, p } from "@webstudio-is/sdk/normalize.css";
import * as tc from "./theme/tailwind-classes";
import {
  propsDialog,
  propsDialogContent,
  propsDialogTrigger,
  propsDialogOverlay,
  propsDialogClose,
  propsDialogTitle,
  propsDialogDescription,
} from "./__generated__/dialog.props";
import { buttonReset, getButtonStyles } from "./theme/styles";

const presetStyle = {
  div,
} satisfies PresetStyle<"div">;

const titlePresetStyle = {
  h2,
} satisfies PresetStyle<"h2">;

const descriptionPresetStyle = {
  p,
} satisfies PresetStyle<"p">;

// @todo add [data-state] to button and link
export const metaDialogTrigger: WsComponentMeta = {
  category: "hidden",
  type: "container",
  icon: TriggerIcon,
  stylable: false,
  constraints: {
    relation: "ancestor",
    component: { $eq: "Dialog" },
  },
};

export const metaDialogOverlay: WsComponentMeta = {
  category: "hidden",
  type: "container",
  presetStyle,
  icon: OverlayIcon,
  constraints: [
    {
      relation: "ancestor",
      component: { $eq: "Dialog" },
    },
    {
      relation: "descendant",
      component: { $eq: "DialogContent" },
    },
  ],
};

export const metaDialogContent: WsComponentMeta = {
  category: "hidden",
  type: "container",
  presetStyle,
  icon: ContentIcon,
  constraints: [
    {
      relation: "ancestor",
      component: { $eq: "DialogOverlay" },
    },
    // often deleted by users
    // though radix starts throwing warnings in console
    /*
    {
      relation: "descendant",
      component: { $eq: "DialogTitle" },
    },
    {
      relation: "descendant",
      component: { $eq: "DialogDescription" },
    },
    */
    {
      relation: "descendant",
      component: { $eq: "DialogClose" },
    },
  ],
};

export const metaDialogTitle: WsComponentMeta = {
  category: "hidden",
  type: "container",
  presetStyle: titlePresetStyle,
  icon: HeadingIcon,
  constraints: {
    relation: "ancestor",
    component: { $eq: "DialogContent" },
  },
};

export const metaDialogDescription: WsComponentMeta = {
  category: "hidden",
  type: "container",
  presetStyle: descriptionPresetStyle,
  icon: TextIcon,
  constraints: {
    relation: "ancestor",
    component: { $eq: "DialogContent" },
  },
};

export const metaDialogClose: WsComponentMeta = {
  category: "hidden",
  type: "container",
  presetStyle: {
    button: [buttonReset, button].flat(),
  },
  states: defaultStates,
  icon: ButtonElementIcon,
  label: "Close Button",
  constraints: {
    relation: "ancestor",
    component: { $eq: "DialogContent" },
  },
};

/**
 * Styles source without animations:
 * https://github.com/shadcn-ui/ui/blob/main/apps/www/registry/default/ui/dialog.tsx
 *
 * Attributions
 * MIT License
 * Copyright (c) 2023 shadcn
 **/
export const metaDialog: WsComponentMeta = {
  category: "radix",
  order: 4,
  type: "container",
  constraints: [
    {
      relation: "descendant",
      component: { $eq: "DialogTrigger" },
    },
    {
      relation: "descendant",
      component: { $eq: "DialogOverlay" },
    },
  ],
  icon: DialogIcon,
  stylable: false,
  description:
    "Displays content with an overlay that covers the window, triggered by a button. Clicking the overlay will close the dialog.",
  template: [
    {
      type: "instance",
      component: "Dialog",
      children: [
        {
          type: "instance",
          component: "DialogTrigger",
          children: [
            {
              type: "instance",
              component: "Button",
              styles: getButtonStyles("outline"),
              children: [{ type: "text", value: "Button", placeholder: true }],
            },
          ],
        },
        {
          type: "instance",
          component: "DialogOverlay",
          /**
           * fixed inset-0 z-50 bg-background/80 backdrop-blur-sm
           * flex
           **/
          styles: [
            tc.fixed(),
            tc.inset(0),
            tc.z(50),
            tc.bg("background", 80),
            tc.backdropBlur("sm"),
            // To allow positioning Content
            tc.flex(),
            tc.overflow("auto"),
          ].flat(),
          children: [
            {
              type: "instance",
              component: "DialogContent",
              /**
               * fixed w-full z-50
               * grid gap-4 max-w-lg
               * m-auto
               * border bg-background p-6 shadow-lg
               **/
              styles: [
                tc.w("full"),
                tc.z(50),
                tc.flex(),
                tc.flex("col"),
                tc.gap(4),
                tc.m("auto"),
                tc.maxW("lg"),
                tc.border(),
                tc.bg("background"),
                tc.p(6),
                tc.shadow("lg"),
                tc.relative(),
              ].flat(),
              children: [
                {
                  type: "instance",
                  component: "Box",
                  label: "Dialog Header",
                  styles: [tc.flex(), tc.flex("col"), tc.gap(1)].flat(),
                  children: [
                    {
                      type: "instance",
                      component: "DialogTitle",
                      /**
                       * text-lg leading-none tracking-tight
                       **/
                      styles: [
                        tc.my(0),
                        tc.leading("none"),
                        tc.text("lg"),
                        tc.tracking("tight"),
                      ].flat(),
                      children: [
                        {
                          type: "text",
                          value: "Dialog Title you can edit",
                          placeholder: true,
                        },
                      ],
                    },
                    {
                      type: "instance",
                      component: "DialogDescription",
                      /**
                       * text-sm text-muted-foreground
                       **/
                      styles: [
                        tc.my(0),
                        tc.text("sm"),
                        tc.text("mutedForeground"),
                      ].flat(),
                      children: [
                        {
                          type: "text",
                          value: "Dialog description text you can edit",
                          placeholder: true,
                        },
                      ],
                    },
                  ],
                },

                {
                  type: "instance",
                  component: "Text",
                  children: [
                    {
                      type: "text",
                      value: "The text you can edit",
                      placeholder: true,
                    },
                  ],
                },

                {
                  type: "instance",
                  component: "DialogClose",
                  /**
                   * absolute right-4 top-4
                   * rounded-sm opacity-70
                   * ring-offset-background
                   * hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                   * flex items-center justify-center h-4 w-4
                   **/
                  styles: [
                    tc.absolute(),
                    tc.right(4),
                    tc.top(4),
                    tc.rounded("sm"),
                    tc.opacity(70),
                    tc.flex(),
                    tc.items("center"),
                    tc.justify("center"),
                    tc.h(4),
                    tc.w(4),
                    tc.border(0),
                    tc.bg("transparent"),
                    tc.outline("none"),
                    tc.hover(tc.opacity(100)),
                    tc.focus(tc.ring("ring", 2, "background", 2)),
                  ].flat(),
                  children: [
                    {
                      type: "instance",
                      component: "HtmlEmbed",
                      label: "Close Icon",
                      props: [
                        {
                          type: "string",
                          name: "code",
                          value: LargeXIcon,
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
    },
  ],
};

export const propsMetaDialog: WsComponentPropsMeta = {
  props: propsDialog,
  initialProps: [],
};

export const propsMetaDialogTrigger: WsComponentPropsMeta = {
  props: propsDialogTrigger,
};

export const propsMetaDialogContent: WsComponentPropsMeta = {
  props: propsDialogContent,
  initialProps: [],
};

export const propsMetaDialogOverlay: WsComponentPropsMeta = {
  props: propsDialogOverlay,
  initialProps: [],
};

export const propsMetaDialogClose: WsComponentPropsMeta = {
  props: propsDialogClose,
  initialProps: [],
};

export const propsMetaDialogTitle: WsComponentPropsMeta = {
  props: propsDialogTitle,
  initialProps: [],
};

export const propsMetaDialogDescription: WsComponentPropsMeta = {
  props: propsDialogDescription,
  initialProps: [],
};
