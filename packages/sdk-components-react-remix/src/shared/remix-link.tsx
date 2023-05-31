import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { NavLink as RemixLink } from "@remix-run/react";
import {
  type Link,
  usePropUrl,
  getInstanceIdFromComponentProps,
} from "@webstudio-is/react-sdk";

type LinkComponent = typeof Link;
type LinkProps = ComponentPropsWithoutRef<LinkComponent>;

export const wrapLinkComponent = (BaseLink: LinkComponent) => {
  const Component: LinkComponent = forwardRef((props: LinkProps, ref) => {
    const href = usePropUrl(getInstanceIdFromComponentProps(props), "href");

    if (href?.type === "page") {
      let to = href.page.path === "" ? "/" : href.page.path;
      if (href.hash !== undefined) {
        to += `#${href.hash}`;
      }
      return <RemixLink {...props} to={to} ref={ref} />;
    }

    return <BaseLink {...props} ref={ref} />;
  });

  Component.displayName = BaseLink.displayName;

  return Component;
};
