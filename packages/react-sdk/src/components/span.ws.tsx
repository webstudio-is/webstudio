import { BrushIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Span } from "./span";

const meta: WsComponentMeta<typeof Span> = {
  type: "rich-text",
  label: "Styled Text",
  Icon: BrushIcon,
  Component: Span,
};

export default meta;
