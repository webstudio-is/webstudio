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
} as const;

const meta: WsComponentMeta<typeof Link> = {
  type: "rich-text",
  label: "Link",
  Icon: Link2Icon,
  Component: Link,
  defaultStyle,
  children: ["Link text you can edit"],
};

export default meta;
