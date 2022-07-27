import { Link2Icon } from "@webstudio-is/icons";
import { Link } from "./link";
import type { WsComponentMeta } from "./component-type";

const defaultStyle = {
  minHeight: {
    type: "unit",
    unit: "em",
    value: 1,
  },
  display: {
    type: "keyword",
    value: "inline-block",
  },
};

export default {
  Icon: Link2Icon,
  Component: Link,
  defaultStyle,
  canAcceptChild: () => false,
  isContentEditable: true,
  isInlineOnly: false,
  label: "Link",
  children: ["Link text you can edit"],
} as WsComponentMeta<typeof Link>;
