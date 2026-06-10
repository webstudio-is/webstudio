import {
  createContext,
  forwardRef,
  type ComponentPropsWithoutRef,
  useContext,
} from "react";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import { Link as BaseLink } from "./link";
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
  const href = String(props.href ?? "");
  const currentHref =
    currentUrlValue ??
    (typeof window === "undefined" ? undefined : window.location.href);
  const currentUrl = currentHref ? new URL(currentHref) : undefined;
  const currentPath = currentUrl && getUrlParts(currentUrl);
  const shouldResolveLocalLink =
    currentPath && currentUrl && isLocalHref(href, assetBaseUrl);
  const localLink = shouldResolveLocalLink
    ? getLocalLinkProps(
        { ...props, href },
        currentPath,
        href.startsWith("#")
          ? currentPath
          : getUrlParts(new URL(href, currentUrl))
      )
    : { linkProps: props, localLinkProps: {} };

  return (
    <BaseLink
      {...stripRouterOnlyProps(localLink.linkProps)}
      {...localLink.localLinkProps}
      href={
        href === "" && currentUrl
          ? `${currentUrl.pathname}${currentUrl.search}`
          : href
      }
      ref={ref}
    />
  );
});

Link.displayName = BaseLink.displayName;

export { Link as RichTextLink };
