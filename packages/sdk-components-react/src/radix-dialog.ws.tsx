import { RadioCheckedIcon } from "@webstudio-is/icons/svg";
import {
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import * as tc from "./theme/tailwind-classes";

import {
  propsDialog,
  propsDialogContent,
  propsDialogTrigger,
  propsDialogOverlay,
} from "./__generated__/radix-dialog.props";

// @todo add [data-state] to button and link
export const metaDialogTrigger: WsComponentMeta = {
  category: "hidden",
  invalidAncestors: [],
  type: "container",
  label: "DialogTrigger",
  icon: RadioCheckedIcon,
  stylable: false,
};

export const metaDialogContent: WsComponentMeta = {
  category: "hidden",
  invalidAncestors: [],
  type: "container",
  label: "DialogContent",
  icon: RadioCheckedIcon,
};

export const metaDialogOverlay: WsComponentMeta = {
  category: "hidden",
  invalidAncestors: [],
  type: "container",
  label: "DialogOverlay",
  icon: RadioCheckedIcon,
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
  invalidAncestors: [],
  type: "container",
  label: "Dialog",
  icon: RadioCheckedIcon,
  order: 15,
  stylable: false,
  template: [
    {
      type: "instance",
      component: "Dialog",
      label: "Dialog",
      props: [
        {
          name: "isOpen",
          // We don't have support for boolean or undefined, instead of binding on open we bind on a string
          type: "string",
          value: "initial",
          dataSourceRef: {
            type: "variable",
            name: "isOpen",
          },
        },
      ],
      children: [
        {
          type: "instance",
          component: "DialogTrigger",
          props: [],
          children: [
            {
              type: "instance",
              component: "Button",
              children: [{ type: "text", value: "Button" }],
            },
          ],
        },
        {
          type: "instance",
          component: "DialogOverlay",
          label: "Dialog Overlay",
          props: [],
          children: [],
          // fixed inset-0 z-50 bg-background/80 backdrop-blur-sm
          styles: [
            tc.fixed(),
            tc.inset(0),
            tc.z(50),
            tc.bg("background", 80),
            tc.backdropBlur("sm"),
          ].flat(),
        },
        {
          type: "instance",
          component: "DialogContent",
          label: "Dialog Content",
          props: [],
          /**
           * fixed w-full z-50
           * grid gap-4 max-w-lg
           * left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]
           * border bg-background p-6 shadow-lg
           **/
          styles: [
            tc.fixed(),
            tc.w("full"),
            tc.z(50),
            // tc.grid(), we don't have grid use flex instead
            tc.flex(),
            tc.gap(4),
            tc.maxW("lg"),
            tc.centerAbsolute(),
            tc.border(),
            tc.bg("background"),
            tc.p(6),
            tc.shadow("lg"),
          ].flat(),
          children: [
            {
              type: "instance",
              component: "Text",
              children: [{ type: "text", value: "The text you can edit" }],
            },
          ],
        },
      ],
    },
  ],
};

export const propsMetaDialog: WsComponentPropsMeta = {
  props: propsDialog,
  initialProps: ["isOpen", "modal"],
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
