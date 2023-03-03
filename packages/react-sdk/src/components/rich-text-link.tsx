import { forwardRef } from "react";
import { Link } from "./link";

export const RichTextLink: typeof Link = forwardRef((props, ref) => (
  <Link {...props} ref={ref} />
));

RichTextLink.displayName = "RichTextLink";
