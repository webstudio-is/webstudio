import { BrushIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Span } from "./span";

const meta: WsComponentMeta<typeof Span> = {
  Icon: BrushIcon,
  Component: Span,
  canAcceptChildren: false,
  isContentEditable: false,
  label: "Styled Text",
  isInlineOnly: true,
  isListed: false,
};

export default meta;
