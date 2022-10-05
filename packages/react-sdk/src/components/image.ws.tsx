import { ImageIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Image } from "./image";

const meta: WsComponentMeta<typeof Image> = {
  Icon: ImageIcon,
  Component: Image,
  canAcceptChildren: false,
  isContentEditable: false,
  isInlineOnly: false,
  isListed: true,
  label: "Image",
};

export default meta;
