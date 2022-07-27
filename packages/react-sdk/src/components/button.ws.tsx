import { ButtonIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Button } from "./button";

export default {
  Icon: ButtonIcon,
  Component: Button,
  canAcceptChild: () => false,
  isContentEditable: true,
  isInlineOnly: false,
  label: "Button",
  children: ["Button text you can edit"],
} as WsComponentMeta<typeof Button>;
