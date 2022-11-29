import { forwardRef, type ElementRef, type ComponentProps } from "react";

type Props = Omit<ComponentProps<"a">, "href"> & { href?: string };

export const Link = forwardRef<ElementRef<"a">, Props>(
  ({ href = "", ...props }, ref) => <a {...props} href={href} ref={ref} />
);

Link.displayName = "Link";
