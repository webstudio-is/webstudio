import type { WsComponentPropsMeta } from "@webstudio-is/react-sdk";
import { props } from "./__generated__/link.props";

export { Link as meta } from "@webstudio-is/sdk-components-react/metas";

export const propsMeta: WsComponentPropsMeta = {
  props: {
    ...props,
    href: {
      type: "string",
      control: "url",
      required: false,
    },
  },
  initialProps: ["href", "target", "prefetch"],
};
