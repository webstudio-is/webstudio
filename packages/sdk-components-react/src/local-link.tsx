import {
  type ComponentPropsWithoutRef,
  type ComponentType,
  type ForwardRefExoticComponent,
  type LegacyRef,
  type RefAttributes,
  forwardRef,
  useContext,
} from "react";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import { Link as BaseLink } from "./link";
import {
  isLocalLinkActive,
  resolveLocalLinkUrl,
  type UrlParts,
} from "./link-utils";

export type LocalLinkProps = Omit<
  ComponentPropsWithoutRef<typeof BaseLink>,
  "target"
> & {
  // override (string & {}) in target to generate keywords
  target?: "_self" | "_blank" | "_parent" | "_top";

  // useful remix props
  prefetch?: "none" | "intent" | "render" | "viewport";
  reloadDocument?: boolean;
  replace?: boolean;
  preventScrollReset?: boolean;
};

type LocalLinkComponent = ForwardRefExoticComponent<
  LocalLinkProps & RefAttributes<HTMLAnchorElement>
>;

type RouterTo = string | Partial<UrlParts>;

type RouterLinkComponentProps = Omit<LocalLinkProps, "href" | "target"> & {
  target?: ComponentPropsWithoutRef<"a">["target"];
  to: RouterTo;
  ref?: LegacyRef<HTMLAnchorElement>;
};

const absoluteUrlPattern = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

const shouldUseRouterLink = (href: string, assetBaseUrl: string) => {
  if (href.startsWith("#") || absoluteUrlPattern.test(href)) {
    return false;
  }

  if (href.startsWith("/") && href.startsWith(assetBaseUrl)) {
    return false;
  }

  return true;
};

const getLocalLinkProps = (
  props: LocalLinkProps & { href: string },
  location: UrlParts,
  resolvedPath: UrlParts
) => {
  const { href, "aria-current": ariaCurrent, className, ...linkProps } = props;
  const target = resolveLocalLinkUrl(href, location, resolvedPath);
  const isActive = isLocalLinkActive(location, target);
  const classNameValue = [className, isActive ? "active" : undefined]
    .filter(Boolean)
    .join(" ");

  return {
    href,
    linkProps,
    localLinkProps: {
      ...(isActive ? { "aria-current": ariaCurrent ?? "page" } : {}),
      ...(classNameValue === "" ? {} : { className: classNameValue }),
    },
  };
};

const getRouterHref = (href: string, location: UrlParts) => {
  if (href === "") {
    return `${location.pathname}${location.search}`;
  }

  return href;
};

const stripRouterOnlyProps = <
  Props extends Pick<
    LocalLinkProps,
    "prefetch" | "reloadDocument" | "replace" | "preventScrollReset"
  >,
>({
  prefetch,
  reloadDocument,
  replace,
  preventScrollReset,
  ...props
}: Props) => props;

/**
 * Remix and React Router expose compatible navigation hooks but from different
 * packages. This factory keeps Webstudio's local-link semantics in one place
 * while each integration supplies its own router primitives.
 */
export const createLocalLink = ({
  Link,
  useLocation,
  useResolvedPath,
}: {
  // Remix v2 and React Router v7 expose compatible Link behavior but different
  // public prop types. This adapter boundary captures only the props Webstudio
  // actually forwards.
  Link: ComponentType<RouterLinkComponentProps>;
  useLocation: () => UrlParts;
  useResolvedPath: (href: string) => UrlParts;
}): LocalLinkComponent => {
  const RouterLink = forwardRef<
    HTMLAnchorElement,
    LocalLinkProps & { href: string }
  >((props, ref) => {
    const location = useLocation();
    const { href, linkProps, localLinkProps } = getLocalLinkProps(
      props,
      location,
      useResolvedPath(props.href)
    );

    return (
      <Link
        {...linkProps}
        {...localLinkProps}
        to={getRouterHref(href, location)}
        ref={ref}
      />
    );
  });

  const HashLink = forwardRef<
    HTMLAnchorElement,
    LocalLinkProps & { href: string }
  >((props, ref) => {
    const location = useLocation();
    const { linkProps, localLinkProps } = getLocalLinkProps(
      props,
      location,
      location
    );
    return (
      <BaseLink
        {...stripRouterOnlyProps(linkProps)}
        {...localLinkProps}
        href={props.href}
        ref={ref}
      />
    );
  });

  const LocalLink = forwardRef<HTMLAnchorElement, LocalLinkProps>(
    (props, ref) => {
      const { assetBaseUrl } = useContext(ReactSdkContext);
      // cast to string when invalid value type is provided with binding
      const href = String(props.href ?? "");

      if (shouldUseRouterLink(href, assetBaseUrl)) {
        // Route through the framework only for navigations it should own. Asset
        // paths can also be root-relative, so they must stay plain anchors.
        return <RouterLink {...props} href={href} ref={ref} />;
      }

      if (href.startsWith("#")) {
        // Hash-only links should preserve the current search params. React Router
        // navigation rewrites them, so keep native anchor behavior and only add
        // Webstudio's aria-current state.
        return <HashLink {...props} href={href} ref={ref} />;
      }

      return <BaseLink {...stripRouterOnlyProps(props)} ref={ref} />;
    }
  );

  LocalLink.displayName = BaseLink.displayName;

  return LocalLink;
};
