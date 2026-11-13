/** Gives rich-text links a distinct component identity while reusing Link. */
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from "react";
import { Link } from "./link";

export const RichTextLink = forwardRef<
  ElementRef<typeof Link>,
  ComponentPropsWithoutRef<typeof Link>
>((props, ref) => <Link {...props} ref={ref} />);

RichTextLink.displayName = "RichTextLink";
