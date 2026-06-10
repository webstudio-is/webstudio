import {
  createContext,
  forwardRef,
  type ComponentPropsWithoutRef,
  useContext,
} from "react";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import type { Link as BaseLink } from "./link";
import {
  getLocalLinkProps,
  getUrlParts,
  isLocalHref,
  stripRouterOnlyProps,
} from "./link-utils";

export const SsgCurrentUrlContext = createContext<string | undefined>(
  undefined
);

export const Link = forwardRef<
  HTMLAnchorElement,
  ComponentPropsWithoutRef<typeof BaseLink>
>((props, ref) => {
  const currentUrlValue = useContext(SsgCurrentUrlContext);
  const { assetBaseUrl } = useContext(ReactSdkContext);
  const {
    children,
    // @todo: it's a hack made for Image component for the builder and should't be in the runtime at all.
    $webstudio$canvasOnly$assetId,
    ...rest
  } = props;
  const href = String(rest.href ?? "");
  const currentHref =
    currentUrlValue ??
    (typeof window === "undefined" ? undefined : window.location.href);
  const currentUrl = currentHref ? new URL(currentHref) : undefined;
  const currentPath = currentUrl && getUrlParts(currentUrl);
  const shouldResolveLocalLink =
    currentPath && currentUrl && isLocalHref(href, assetBaseUrl);
  const localLink = shouldResolveLocalLink
    ? getLocalLinkProps(
        { ...rest, href },
        currentPath,
        href.startsWith("#")
          ? currentPath
          : getUrlParts(new URL(href, currentUrl))
      )
    : { linkProps: rest, localLinkProps: {} };

  return (
    <a
      {...stripRouterOnlyProps(localLink.linkProps)}
      {...localLink.localLinkProps}
      href={
        href === "" && currentUrl
          ? `${currentUrl.pathname}${currentUrl.search}`
          : href
      }
      ref={ref}
    >
      {children}
    </a>
  );
});

Link.displayName = "Link";

export { Link as RichTextLink };
