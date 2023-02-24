import { forwardRef, type ElementRef, type ComponentProps } from "react";

// @todo props that come from remix link, shouldn't be here at all
// - prefetch should be only on remix component and it already is
// - props meta should be generated from Remix link
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
