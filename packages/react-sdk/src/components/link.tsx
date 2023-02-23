import { forwardRef, type ElementRef, type ComponentProps } from "react";

type Props = Omit<ComponentProps<"a">, "href" | "target"> & {
  href?: string;
  target?: "self" | "blank" | "parent" | "top";
  prefetch?: "none" | "intent" | "render";
};

export const Link = forwardRef<ElementRef<"a">, Props>(
  ({ href = "", target = "self", ...props }, ref) => {
    return <a {...props} target={`_${target}`} href={href} ref={ref} />;
  }
);

Link.displayName = "Link";
