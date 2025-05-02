import {
  DialogIcon,
  TriggerIcon,
  ContentIcon,
  OverlayIcon,
  HeadingIcon,
  TextIcon,
  ButtonElementIcon,
} from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";
import { div, button, h2, p } from "@webstudio-is/sdk/normalize.css";
import { radix } from "./shared/meta";
import {
  propsDialog,
  propsDialogContent,
  propsDialogTrigger,
  propsDialogOverlay,
  propsDialogClose,
  propsDialogTitle,
  propsDialogDescription,
} from "./__generated__/dialog.props";
import { buttonReset } from "./shared/preset-styles";

// @todo add [data-state] to button and link
export const metaDialogTrigger: WsComponentMeta = {
  icon: TriggerIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
  },
};

export const metaDialogOverlay: WsComponentMeta = {
  icon: OverlayIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
    descendants: [radix.DialogContent],
  },
  presetStyle: {
    div,
  },
};

export const metaDialogContent: WsComponentMeta = {
  icon: ContentIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
    descendants: [
      radix.DialogTitle,
      radix.DialogDescription,
      radix.DialogClose,
    ],
  },
  presetStyle: {
    div,
  },
};

export const metaDialogTitle: WsComponentMeta = {
  icon: HeadingIcon,
  contentModel: {
    category: "none",
    children: ["instance", "rich-text"],
  },
  presetStyle: {
    h2,
  },
};

export const metaDialogDescription: WsComponentMeta = {
  icon: TextIcon,
  contentModel: {
    category: "none",
    children: ["instance", "rich-text"],
  },
  presetStyle: {
    p,
  },
};

export const metaDialogClose: WsComponentMeta = {
  icon: ButtonElementIcon,
  label: "Close Button",
  contentModel: {
    category: "none",
    children: ["instance", "rich-text"],
  },
  states: defaultStates,
  presetStyle: {
    button: [buttonReset, button].flat(),
  },
};

export const metaDialog: WsComponentMeta = {
  icon: DialogIcon,
  contentModel: {
    category: "instance",
    children: ["instance"],
    descendants: [radix.DialogTrigger, radix.DialogOverlay],
  },
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
