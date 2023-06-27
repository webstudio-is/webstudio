import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { NavLink as RemixLink } from "@remix-run/react";
import {
  usePropUrl,
  getInstanceIdFromComponentProps,
} from "@webstudio-is/react-sdk";
import type { Link } from "@webstudio-is/sdk-components-react";

type Props = Omit<ComponentPropsWithoutRef<typeof Link>, "target"> & {
  // override (string & {}) in target to generate keywords
  target?: "_self" | "_blank" | "_parent" | "_top";

  // useful remix props
  prefetch?: "intent" | "render" | "none";
  reloadDocument?: boolean;
  replace?: boolean;
  preventScrollReset?: boolean;
};

export const wrapLinkComponent = (BaseLink: typeof Link) => {
  const Component = forwardRef<HTMLAnchorElement, Props>((props, ref) => {
    const href = usePropUrl(getInstanceIdFromComponentProps(props), "href");

    if (href?.type === "page") {
      let to = href.page.path === "" ? "/" : href.page.path;
      const urlTo = new URL(to, "https://any-valid.url");
      to = urlTo.pathname;

      if (href.hash !== undefined) {
        urlTo.hash = href.hash;
        to = `${urlTo.pathname}${urlTo.hash}`;
      }

      return <RemixLink {...props} to={to} ref={ref} />;
    }

    return <BaseLink {...props} ref={ref} />;
  });

  Component.displayName = BaseLink.displayName;

  return Component;
};
