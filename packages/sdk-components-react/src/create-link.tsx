import {
  type ComponentPropsWithoutRef,
  type ComponentType,
  type ForwardRefExoticComponent,
  type LegacyRef,
  type RefAttributes,
  type ReactNode,
  forwardRef,
  useContext,
} from "react";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import { BaseLink } from "./link";
import { LinkCurrentUrlContext } from "./link-current-url";
import { isInternalHref, type UrlParts } from "@webstudio-is/sdk/link-utils";
import { getCurrentLinkProps, stripRouterOnlyProps } from "./link-utils";

export type LinkProps = Omit<
  ComponentPropsWithoutRef<typeof BaseLink>,
  "target"
> & {
  // override (string & {}) in target to generate keywords
  target?: "_self" | "_blank" | "_parent" | "_top";

  // useful remix props
  prefetch?: "none" | "intent" | "render" | "viewport";
  discover?: "render" | "none";
  reloadDocument?: boolean;
  replace?: boolean;
  preventScrollReset?: boolean;
  relative?: "route" | "path";
  state?: unknown;
  viewTransition?: boolean;
};

type LinkComponent = ForwardRefExoticComponent<
  LinkProps & RefAttributes<HTMLAnchorElement>
>;

type RouterTo = string | Partial<UrlParts>;

type RouterLinkComponentProps = Omit<LinkProps, "href" | "target"> & {
  target?: ComponentPropsWithoutRef<"a">["target"];
  to: RouterTo;
  ref?: LegacyRef<HTMLAnchorElement>;
};

const getRouterHref = (href: string, location: UrlParts) => {
  if (href === "") {
    return `${location.pathname}${location.search}`;
  }

  return href;
};

const getCurrentHref = (location: UrlParts) =>
  `https://webstudio.local${location.pathname}${location.search}${location.hash}`;

const CurrentUrlProvider = ({
  children,
  location,
}: {
  children: ReactNode;
  location: UrlParts;
}) => (
  <LinkCurrentUrlContext.Provider value={getCurrentHref(location)}>
    {children}
  </LinkCurrentUrlContext.Provider>
);

/**
 * Creates a framework-aware Link.
 *
 * Internal route links render the framework Link component so Remix/React
 * Router keep their own navigation, discovery, prefetch, and transition
 * behavior. Hash-only, external, and asset links fall back to BaseLink because
 * they should behave like native anchors while still supporting current-link
 * styling.
 */
export const createLink = ({
  Link,
  useLocation,
  useResolvedPath,
}: {
  Link: ComponentType<RouterLinkComponentProps>;
  useLocation: () => UrlParts;
  useResolvedPath: (href: string) => UrlParts;
}): LinkComponent => {
  const RouterLink = forwardRef<
    HTMLAnchorElement,
    LinkProps & { href: string }
  >((props, ref) => {
    const location = useLocation();
    const href = getRouterHref(props.href, location);
    const { linkProps, currentLinkProps } = getCurrentLinkProps(
      props,
      location,
      useResolvedPath(props.href)
    );

    return (
      <CurrentUrlProvider location={location}>
        <Link {...linkProps} {...currentLinkProps} to={href} ref={ref} />
      </CurrentUrlProvider>
    );
  });

  const HashLink = forwardRef<HTMLAnchorElement, LinkProps & { href: string }>(
    (props, ref) => {
      const location = useLocation();
      return (
        <CurrentUrlProvider location={location}>
          <BaseLink
            {...stripRouterOnlyProps(props)}
            href={props.href}
            ref={ref}
          />
        </CurrentUrlProvider>
      );
    }
  );

  const FrameworkLink = forwardRef<HTMLAnchorElement, LinkProps>(
    (props, ref) => {
      const { assetBaseUrl } = useContext(ReactSdkContext);
      if (props.href === undefined) {
        return <BaseLink {...stripRouterOnlyProps(props)} ref={ref} />;
      }
      // cast to string when invalid value type is provided with binding
      const href = String(props.href);

      if (
        href.startsWith("#") === false &&
        isInternalHref(href, assetBaseUrl)
      ) {
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

  FrameworkLink.displayName = BaseLink.displayName;

  return FrameworkLink;
};
