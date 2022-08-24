import { ButtonIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Button } from "./button";

const meta: WsComponentMeta<typeof Button> = {
  Icon: ButtonIcon,
  Component: Button,
  canAcceptChildren: false,
  isContentEditable: true,
  isInlineOnly: false,
  isListed: true,
  label: "Button",
  children: ["Button text you can edit"],
};

export default meta;
