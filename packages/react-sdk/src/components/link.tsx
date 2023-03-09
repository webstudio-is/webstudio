import { forwardRef, type ElementRef, type ComponentProps } from "react";

// @todo props that come from remix link, shouldn't be here at all
// - prefetch should be only on remix component and it already is
// - props meta should be generated from Remix link
// - changing this requires update in app/canvas/custom-components/link.tsx
type Props = Omit<ComponentProps<"a">, "href" | "target"> & {
  href?: string;
  target?: "_self" | "_blank" | "_parent" | "_top";
  prefetch?: "none" | "intent" | "render";
};

export const Link = forwardRef<ElementRef<"a">, Props>(
  ({ href = "", ...props }, ref) => {
    return <a {...props} href={href} ref={ref} />;
  }
);

Link.displayName = "Link";
