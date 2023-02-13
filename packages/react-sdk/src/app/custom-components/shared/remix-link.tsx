import { Link } from "@remix-run/react";
import type {
  ElementRef,
  ComponentProps,
  RefAttributes,
  ForwardRefExoticComponent,
} from "react";
import { forwardRef } from "react";

const isAbsoluteUrl = (href: string) => {
  try {
    new URL(href);
    return true;
  } catch (e) {
    return false;
  }
};

// Remix's check for absolute URL copied from here:
// https://github.com/remix-run/react-router/blob/react-router-dom%406.8.0/packages/react-router-dom/index.tsx#L423-L424
const isAbsoluteUrlRemix = (href: string) =>
  /^[a-z+]+:\/\//i.test(href) || href.startsWith("//");

type Props = Omit<ComponentProps<"a">, "href"> & { href?: string };

type Ref = ElementRef<"a">;

export const wrapLinkComponent = (
  BaseLink: ForwardRefExoticComponent<Props & RefAttributes<Ref>>
) => {
  // We're not actually wrapping BaseLink (no way to wrap with Remix's Link),
  // but this is still useful because we're making sure that props/ref types are compatible
  const Component = forwardRef<Ref, Props>(({ href = "", ...props }, ref) => {
    const isAbsolute = isAbsoluteUrl(href);

    // This is a workaround for a bug in Remix: https://github.com/remix-run/remix/issues/5440
    // It has a buggy absolute URL detection, which gives false positives on value like "//" or "http://"
    // and causes entire app to crash
    const willRemixTryToTreatAsAbsoluteAndCrash =
      isAbsolute === false && isAbsoluteUrlRemix(href);

    if (isAbsolute || willRemixTryToTreatAsAbsoluteAndCrash) {
      return (
        <a
          {...props}
          href={willRemixTryToTreatAsAbsoluteAndCrash ? "" : href}
          ref={ref}
        />
      );
    }

    return <Link {...props} to={href} ref={ref} />;
  });

  // This is the only part that we use from BaseLink at runtime
  Component.displayName = BaseLink.displayName;

  return Component;
};
