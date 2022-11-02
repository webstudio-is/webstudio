import { ImageIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Image } from "./image";

const defaultStyle = {
  maxWidth: {
    type: "unit",
    unit: "%",
    value: 100,
  },
} as const;

const meta: WsComponentMeta<typeof Image> = {
  Icon: ImageIcon,
  Component: Image,
  canAcceptChildren: false,
  defaultStyle,
  isContentEditable: false,
  isInlineOnly: false,
  isListed: true,
  label: "Image",
};

export default meta;
