import type { ComponentPropsWithoutRef } from "react";
import {
  isLocalLinkActive,
  resolveLocalLinkUrl,
  type UrlParts,
} from "@webstudio-is/sdk/link-utils";

type AnchorProps = ComponentPropsWithoutRef<"a">;

export const getCurrentLinkProps = <
  Props extends {
    href: string;
    "aria-current"?: AnchorProps["aria-current"];
    className?: string;
  },
>(
  props: Props,
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
    linkProps,
    currentLinkProps: {
      ...(isActive ? { "aria-current": ariaCurrent ?? "page" } : {}),
      ...(classNameValue === "" ? {} : { className: classNameValue }),
    },
  };
};

export const stripRouterOnlyProps = <
  Props extends {
    prefetch?: unknown;
    discover?: unknown;
    reloadDocument?: unknown;
    replace?: unknown;
    preventScrollReset?: unknown;
    relative?: unknown;
    state?: unknown;
    viewTransition?: unknown;
  },
>({
  prefetch,
  discover,
  reloadDocument,
  replace,
  preventScrollReset,
  relative,
  state,
  viewTransition,
  ...props
}: Props) => props;
