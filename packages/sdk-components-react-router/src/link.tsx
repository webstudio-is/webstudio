import { type ComponentPropsWithoutRef, forwardRef, useContext } from "react";
import { NavLink as RemixLink, useLocation } from "react-router";
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
  const location = useLocation();

  // computeIsCurrent: inline helper (uses current `location`) to determine
  // whether `linkHref` matches the current full URL (pathname + search + hash).
  const computeIsCurrent = (linkHref: string): boolean => {
    try {
      const base =
        typeof window !== "undefined" && window.location?.origin
          ? window.location.origin
          : "http://localhost";

      const currentFull = `${location.pathname}${location.search}${location.hash}`;

      // Treat empty href as a reference to the current location
      let normalizedLink = linkHref === "" ? currentFull : linkHref;

      // Normalize relative ?search and #hash links
      if (normalizedLink.startsWith("?")) {
        normalizedLink = `${location.pathname}${normalizedLink}`;
      } else if (normalizedLink.startsWith("#")) {
        normalizedLink = `${location.pathname}${location.search}${normalizedLink}`;
      }

      const target = new URL(normalizedLink, base);
      const current = new URL(currentFull, base);

      const strip = (p: string) =>
        p.endsWith("/") && p !== "/" ? p.slice(0, -1) : p;

      return (
        strip(target.pathname) === strip(current.pathname) &&
        target.search === current.search &&
        target.hash === current.hash
      );
    } catch {
      return false;
    }
  };

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
    // Compute aria-current based on full URL (pathname + search + hash)
    const ariaCurrent = computeIsCurrent(href) ? "page" : undefined;

    return (
      <RemixLink
        {...props}
        to={href}
        ref={ref}
        end
        aria-current={ariaCurrent}
      />
    );
  }

  const { prefetch, reloadDocument, replace, preventScrollReset, ...rest } =
    props;

  return <BaseLink {...rest} ref={ref} />;
});

Link.displayName = BaseLink.displayName;
