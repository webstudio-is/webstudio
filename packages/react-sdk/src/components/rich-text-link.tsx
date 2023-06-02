import { forwardRef } from "react";
import { TextLink } from "./text-link";

export const RichTextLink: typeof TextLink = forwardRef((props, ref) => (
  <TextLink {...props} ref={ref} />
));

RichTextLink.displayName = "RichTextLink";
