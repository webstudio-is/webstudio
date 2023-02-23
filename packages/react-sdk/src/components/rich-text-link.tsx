import { forwardRef, type ElementRef, type ComponentProps } from "react";
import { Link } from "./link";

type Props = ComponentProps<typeof Link>;

export const RichTextLink = forwardRef<ElementRef<"a">, Props>((props, ref) => (
  <Link {...props} ref={ref} />
));

RichTextLink.displayName = "RichTextLink";
