import { BrushIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Superscript } from "./superscript";

const meta: WsComponentMeta<typeof Superscript> = {
  Icon: BrushIcon,
  Component: Superscript,
  canAcceptChildren: false,
  isContentEditable: false,
  label: "Superscript Text",
  isInlineOnly: true,
  isListed: false,
};

export default meta;
