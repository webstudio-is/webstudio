import { SuperscriptIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Superscript } from "./superscript";

const meta: WsComponentMeta<typeof Superscript> = {
  type: "rich-text-child",
  label: "Superscript Text",
  Icon: SuperscriptIcon,
  Component: Superscript,
};

export default meta;
