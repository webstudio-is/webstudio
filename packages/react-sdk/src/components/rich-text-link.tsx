import { forwardRef, type ElementRef, type ComponentProps } from "react";

const defaultTag = "a";

type RichTextLinkProps = Omit<ComponentProps<typeof defaultTag>, "href"> & {
  href?: string;
};

export const RichTextLink = forwardRef<
  ElementRef<typeof defaultTag>,
  RichTextLinkProps
>(({ href = "", ...props }, ref) => <a {...props} href={href} ref={ref} />);

RichTextLink.displayName = "RichTextLink";
