import { Link } from "@remix-run/react";
import type {
  ElementRef,
  ComponentProps,
  RefAttributes,
  ForwardRefExoticComponent,
} from "react";
import { forwardRef } from "react";

// href starts with http:, mailto:, tel:, etc.
const isAbsoluteUrl = (href: string) => /^[a-z]+:/i.test(href);

type Props = Omit<ComponentProps<"a">, "href"> & { href?: string };

type Ref = ElementRef<"a">;

export const wrapLinkComponent = (
  BaseLink: ForwardRefExoticComponent<Props & RefAttributes<Ref>>
) => {
  // We're not actually wrapping BaseLink (no way to wrap with Remix's Link),
  // but this is still useful because we're making sure that props/ref types are compatible
  const Component = forwardRef<Ref, Props>(({ href = "", ...props }, ref) =>
    isAbsoluteUrl(href) ? (
      <a {...props} href={href} ref={ref} />
    ) : (
      <Link {...props} to={href} ref={ref} />
    )
  );

  // This is the only part that we use from BaseLink at runtime
  Component.displayName = BaseLink.displayName;

  return Component;
};
