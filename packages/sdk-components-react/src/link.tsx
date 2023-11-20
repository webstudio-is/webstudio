import { forwardRef, type ComponentProps } from "react";

export const defaultTag = "a";

type Props = Omit<ComponentProps<"a">, "target"> & {
  // override (string & {}) in target to generate keywords
  target?: "_self" | "_blank" | "_parent" | "_top";
};

export const Link = forwardRef<HTMLAnchorElement, Props>(
  ({ children, ...props }, ref) => {
    return (
      <a {...props} href={props.href ?? "#"} ref={ref}>
        {children ?? "Link text you can edit"}
      </a>
    );
  }
);

Link.displayName = "Link";
