import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { NavLink as RemixLink } from "@remix-run/react";
import { usePages } from "@webstudio-is/react-sdk";
import type { Link } from "@webstudio-is/sdk-components-react";

type Props = Omit<ComponentPropsWithoutRef<typeof Link>, "target"> & {
  // override (string & {}) in target to generate keywords
  target?: "_self" | "_blank" | "_parent" | "_top";

  // useful remix props
  prefetch?: "none" | "intent" | "render" | "viewport";
  reloadDocument?: boolean;
  replace?: boolean;
  preventScrollReset?: boolean;
};

export const wrapLinkComponent = (BaseLink: typeof Link) => {
  const Component = forwardRef<HTMLAnchorElement, Props>((props, ref) => {
    const pages = usePages();
    const href = props.href;

    // use remix link when url references webstudio page
    if (href !== undefined) {
      const url = new URL(href, "https://any-valid.url");
      for (const page of pages.values()) {
        if (page.path === url.pathname) {
          return <RemixLink {...props} to={href} ref={ref} />;
        }
      }
    }

    const { prefetch, reloadDocument, replace, preventScrollReset, ...rest } =
      props;

    return <BaseLink {...rest} ref={ref} />;
  });

  Component.displayName = BaseLink.displayName;

  return Component;
};
