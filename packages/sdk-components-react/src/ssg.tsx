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

type LinkProps = Omit<ComponentPropsWithoutRef<typeof BaseLink>, "target"> & {
  target?: "_self" | "_blank" | "_parent" | "_top";
};

const getCurrentUrl = (currentUrl: string | undefined) => {
  if (currentUrl) {
    return new URL(currentUrl);
  }
  if (typeof window !== "undefined") {
    return new URL(window.location.href);
  }
};

export const Link = forwardRef<HTMLAnchorElement, LinkProps>((props, ref) => {
  const currentUrlValue = useContext(SsgCurrentUrlContext);
  const { assetBaseUrl } = useContext(ReactSdkContext);
  const href = String(props.href ?? "");
  const currentUrl = getCurrentUrl(currentUrlValue);
  const currentPath = currentUrl && getUrlParts(currentUrl);
  const localLink =
    currentUrl && currentPath && isLocalHref(href, assetBaseUrl)
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
