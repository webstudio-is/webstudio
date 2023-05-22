import { CodeIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/html.props";

export const meta: WsComponentMeta = {
  category: "general",
  type: "embed",
  label: "Html",
  Icon: CodeIcon,
};

export const propsMeta: WsComponentPropsMeta = {
  props: {
    ...props,
    code: {
      required: true,
      control: "code",
      type: "string",
      rows: 10,
    },
  },
};
