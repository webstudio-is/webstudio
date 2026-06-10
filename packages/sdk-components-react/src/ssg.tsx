import {
  createContext,
  forwardRef,
  type ComponentPropsWithoutRef,
  useContext,
} from "react";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import type { Link as BaseLink } from "./link";

export const SsgCurrentUrlContext = createContext<string | undefined>(
  undefined
);

const isLocalHref = (href: string, assetBaseUrl: string) =>
  /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href) === false &&
  (href.startsWith("/") && href.startsWith(assetBaseUrl)) === false;

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
    prefetch,
    preventScrollReset,
    reloadDocument,
    replace,
    "aria-current": ariaCurrent,
    className,
    ...rest
  } = props;
  const href = String(rest.href ?? "");
  const currentHref =
    currentUrlValue ??
    (typeof window === "undefined" ? undefined : window.location.href);
  const currentUrl = currentHref ? new URL(currentHref) : undefined;
  let ariaCurrentValue = ariaCurrent;
  let classNameValue = className;

  if (currentUrl && isLocalHref(href, assetBaseUrl)) {
    const target =
      href === ""
        ? {
            pathname: currentUrl.pathname,
            search: currentUrl.search,
            hash: "",
          }
        : href.startsWith("#")
          ? {
              pathname: currentUrl.pathname,
              search: currentUrl.search,
              hash: href === "#" ? "" : href,
            }
          : new URL(href, currentUrl);
    const isActive =
      currentUrl.pathname === target.pathname &&
      currentUrl.search === target.search &&
      currentUrl.hash === target.hash;

    ariaCurrentValue = isActive ? (ariaCurrent ?? "page") : undefined;
    classNameValue = [className, isActive ? "active" : undefined]
      .filter(Boolean)
      .join(" ");
  }

  return (
    <a
      {...rest}
      {...(ariaCurrentValue === undefined
        ? {}
        : { "aria-current": ariaCurrentValue })}
      {...(classNameValue ? { className: classNameValue } : {})}
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
