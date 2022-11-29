import { useLocation } from "@remix-run/react";
import type {
  ElementRef,
  ComponentProps,
  ForwardRefExoticComponent,
  RefAttributes,
} from "react";
import { forwardRef } from "react";
import { preserveSearchBuildParams } from "~/shared/router-utils";

const isAbsoluteUrl = (href: string) => {
  try {
    new URL(href);
    return true;
  } catch (e) {
    return false;
  }
};

export const preserveBuildParams = (href: string, sourceSearch: string) => {
  if (isAbsoluteUrl(href)) {
    return href;
  }

  const url = new URL(
    href,
    // doesn't affect anything, just need some base to use URL
    "http://localhost"
  );

  preserveSearchBuildParams(
    new URLSearchParams(sourceSearch),
    url.searchParams
  );

  const search = url.searchParams.toString();

  return `${url.pathname}${search === "" ? "" : `?${search}`}`;
};

type Props = Omit<ComponentProps<"a">, "href"> & { href?: string };

type Ref = ElementRef<"a">;

export const wrapLinkComponent = (
  BaseLink: ForwardRefExoticComponent<Props & RefAttributes<Ref>>
) => {
  const Component = forwardRef<Ref, Props>(({ href = "", ...props }, ref) => {
    const { search } = useLocation();
    return (
      <BaseLink {...props} href={preserveBuildParams(href, search)} ref={ref} />
    );
  });

  Component.displayName = BaseLink.displayName;

  return Component;
};
