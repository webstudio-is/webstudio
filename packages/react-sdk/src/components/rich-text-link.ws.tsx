import { Link2Icon } from "@webstudio-is/icons";
import { RichTextLink } from "./rich-text-link";
import type { WsComponentMeta } from "./component-type";

const meta: WsComponentMeta<typeof RichTextLink> = {
  Icon: Link2Icon,
  Component: RichTextLink,
  canAcceptChildren: false,
  isContentEditable: false,
  isInlineOnly: true,
  isListed: false,
  label: "Link",
};

export default meta;
