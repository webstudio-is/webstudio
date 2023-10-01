import { forwardRef, type ComponentProps } from "react";

export const defaultTag = "a";

type Props = Omit<ComponentProps<"a">, "target"> & {
  // override (string & {}) in target to generate keywords
  target?: "_self" | "_blank" | "_parent" | "_top";
};

export const Link = forwardRef<HTMLAnchorElement, Props>((props, ref) => {
  return <a {...props} href={props.href ?? "#"} ref={ref} />;
});

Link.displayName = "Link";
