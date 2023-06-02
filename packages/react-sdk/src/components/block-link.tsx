import { forwardRef } from "react";
import { TextLink } from "./text-link";
export { defaultTag } from "./text-link";

export const BlockLink: typeof TextLink = forwardRef((props, ref) => (
  <TextLink {...props} ref={ref} />
));

BlockLink.displayName = "BlockLink";
