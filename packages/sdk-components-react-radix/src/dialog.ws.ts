import {
  DialogIcon,
  TriggerIcon,
  ContentIcon,
  OverlayIcon,
  HeadingIcon,
  TextIcon,
  ButtonElementIcon,
} from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";
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
  props: propsDialogTrigger,
};

export const metaDialogOverlay: WsComponentMeta = {
  icon: OverlayIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
    descendants: [radix.DialogContent],
  },
  presetStyle: { div },
  props: propsDialogOverlay,
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
  presetStyle: { div },
  props: propsDialogContent,
};

export const metaDialogTitle: WsComponentMeta = {
  icon: HeadingIcon,
  contentModel: {
    category: "none",
    children: ["instance", "rich-text"],
  },
  presetStyle: { h2 },
  props: propsDialogTitle,
};

export const metaDialogDescription: WsComponentMeta = {
  icon: TextIcon,
  contentModel: {
    category: "none",
    children: ["instance", "rich-text"],
  },
  presetStyle: { p },
  props: propsDialogDescription,
};

export const metaDialogClose: WsComponentMeta = {
  icon: ButtonElementIcon,
  label: "Close Button",
  contentModel: {
    category: "none",
    children: ["instance", "rich-text"],
  },
  presetStyle: {
    button: [buttonReset, button].flat(),
  },
  props: propsDialogClose,
};

export const metaDialog: WsComponentMeta = {
  icon: DialogIcon,
  contentModel: {
    category: "instance",
    children: ["instance"],
    descendants: [radix.DialogTrigger, radix.DialogOverlay],
  },
  initialProps: ["open"],
  props: propsDialog,
};
