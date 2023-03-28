import { Link as RemixLink } from "@remix-run/react";
import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";
import type { Link } from "../../../components/link";
import { usePropUrl, getInstanceIdFromComponentProps } from "../../../props";

type LinkComponent = typeof Link;
type LinkProps = ComponentPropsWithoutRef<LinkComponent>;

export const wrapLinkComponent = (BaseLink: LinkComponent) => {
  const Component: LinkComponent = forwardRef((props: LinkProps, ref) => {
    const href = usePropUrl(getInstanceIdFromComponentProps(props), "href");

    if (typeof href === "string" || href === undefined) {
      return <BaseLink {...props} ref={ref} />;
    }

    return <RemixLink {...props} to={href.path} ref={ref} />;
  });

  Component.displayName = BaseLink.displayName;

  return Component;
};
