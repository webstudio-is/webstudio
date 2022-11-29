import { forwardRef, type ElementRef, type ComponentProps } from "react";

export type RichTextLinkProps = Omit<ComponentProps<"a">, "href"> & {
  href?: string;
};

export type RichTextLinkRef = ElementRef<"a">;

export const RichTextLink = forwardRef<RichTextLinkRef, RichTextLinkProps>(
  ({ href = "", ...props }, ref) => <a {...props} href={href} ref={ref} />
);

RichTextLink.displayName = "RichTextLink";
