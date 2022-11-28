import { forwardRef, type ElementRef, type ComponentProps } from "react";
import { renderLink } from "./link";

type RichTextLinkProps = Omit<ComponentProps<"a">, "href"> & {
  href?: string;
};

export const RichTextLink = forwardRef<ElementRef<"a">, RichTextLinkProps>(
  ({ href = "", ...props }, ref) => renderLink(href, props, ref)
);

RichTextLink.displayName = "RichTextLink";
