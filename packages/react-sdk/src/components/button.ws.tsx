import { ButtonIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Button } from "./button";

const meta: WsComponentMeta<typeof Button> = {
  type: "rich-text",
  label: "Button",
  Icon: ButtonIcon,
  Component: Button,
  children: ["Button text you can edit"],
};

export default meta;
