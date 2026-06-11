/**
 * @deprecated This component will be replaced by the Element component in the future.
 * Use Element with tag="a" instead.
 */
import { forwardRef, useContext, type ComponentProps } from "react";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import { isInternalHref } from "@webstudio-is/sdk/link-utils";
import { getCurrentLinkProps, stripRouterOnlyProps } from "./link-utils";
import { LinkCurrentUrlContext } from "./link-current-url";

export const defaultTag = "a";

type Props = Omit<ComponentProps<"a">, "target" | "download"> & {
  // override (string & {}) in target to generate keywords
  target?: "_self" | "_blank" | "_parent" | "_top";
  download?: boolean;
  prefetch?: "none" | "intent" | "render" | "viewport";
  discover?: "render" | "none";
  preventScrollReset?: boolean;
  reloadDocument?: boolean;
  replace?: boolean;
  relative?: "route" | "path";
  state?: unknown;
  viewTransition?: boolean;
};

const getWindowCurrentUrl = () => {
  if (typeof window === "undefined") {
    return;
  }
  return window.location.href;
};

const getCurrentUrl = (value: string | URL | undefined) => {
  if (value === undefined) {
    return;
  }
  return new URL(value, "https://webstudio.local");
};

/**
 * Plain Webstudio anchor implementation.
 *
 * Used by base components, SSG, builder preview, and framework-link fallbacks.
 * It owns current-link styling for native anchors, while framework packages
 * keep their own Link components for route navigation and prefetch behavior.
 */
export const BaseLink = forwardRef<
  HTMLAnchorElement,
  Props & { $webstudio$canvasOnly$assetId?: string | undefined }
>((props, ref) => {
  const currentUrlValue = useContext(LinkCurrentUrlContext);
  const { assetBaseUrl } = useContext(ReactSdkContext);
  const {
    children,
    // @todo: it's a hack made for Image component for the builder and should't be in the runtime at all.
    $webstudio$canvasOnly$assetId,
    "aria-current": ariaCurrent,
    className,
    ...rest
  } = props;
  const hasHref = rest.href !== undefined;
  const href = hasHref ? String(rest.href) : "#";
  const currentHref = currentUrlValue ?? getWindowCurrentUrl();
  const currentUrl = getCurrentUrl(currentHref);
  let linkProps = stripRouterOnlyProps(rest);
  let currentLinkProps = {
    ...(ariaCurrent === undefined ? {} : { "aria-current": ariaCurrent }),
    ...(className === undefined ? {} : { className }),
  };

  if (currentUrl && hasHref && isInternalHref(href, assetBaseUrl)) {
    const props = getCurrentLinkProps(
      { ...rest, href, "aria-current": ariaCurrent, className },
      currentUrl,
      new URL(href, currentUrl)
    );
    linkProps = stripRouterOnlyProps(props.linkProps);
    currentLinkProps = props.currentLinkProps;
  }

  return (
    <a
      {...linkProps}
      {...currentLinkProps}
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

BaseLink.displayName = "Link";

export { BaseLink as Link };
