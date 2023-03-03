import { forwardRef } from "react";
import { Link } from "./link";

export const LinkBlock: typeof Link = forwardRef((props, ref) => (
  <Link {...props} ref={ref} />
));

LinkBlock.displayName = "LinkBlock";
