import { forwardRef, type ComponentPropsWithoutRef, useContext } from "react";
import { NavLink as RemixLink } from "@remix-run/react";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import { Link as BaseLink } from "@webstudio-is/sdk-components-react";

type Props = Omit<ComponentPropsWithoutRef<typeof BaseLink>, "target"> & {
  // override (string & {}) in target to generate keywords
  target?: "_self" | "_blank" | "_parent" | "_top";

  // useful remix props
  prefetch?: "none" | "intent" | "render" | "viewport";
  reloadDocument?: boolean;
  replace?: boolean;
  preventScrollReset?: boolean;
};

export const Link = forwardRef<HTMLAnchorElement, Props>((props, ref) => {
  const { assetBaseUrl } = useContext(ReactSdkContext);
  // cast to string when invalid value type is provided with binding
  const href = String(props.href ?? "");

  // use remix link for self reference and all relative urls
  // ignore asset paths which can be relative too
  // urls starting with # should be handled natively to not override search params
  if (
    // remix appends ?index in runtime but not in ssr
    href === "" ||
    href.startsWith("?") ||
    (href.startsWith("/") && href.startsWith(assetBaseUrl) === false)
  ) {
    // In the future, we will switch to the :local-link pseudo-class (https://developer.mozilla.org/en-US/docs/Web/CSS/:local-link). (aria-current="page" is used now)
    // Therefore, we decided to use end={true} (exact route matching) for all links to facilitate easier migration.
    return <RemixLink {...props} to={href} ref={ref} end />;
  }

  const { prefetch, reloadDocument, replace, preventScrollReset, ...rest } =
    props;

  return <BaseLink {...rest} ref={ref} />;
});

Link.displayName = BaseLink.displayName;
