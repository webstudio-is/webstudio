import { forwardRef, type ElementRef, type ComponentProps } from "react";

export type LinkProps = Omit<ComponentProps<"a">, "href"> & {
  href?: string;
};

export type LinkRef = ElementRef<"a">;

export const Link = forwardRef<LinkRef, LinkProps>(
  ({ href = "", ...props }, ref) => <a {...props} href={href} ref={ref} />
);

Link.displayName = "Link";
