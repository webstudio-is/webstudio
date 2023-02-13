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
    //
    // It has a buggy absolute URL detection, which gives false positives on value like "//" or "http://"
    // and causes entire app to crash.
    //
    // Condition is copied from Remix's code:
    // https://github.com/remix-run/remix/blob/9adf87c663207e687fbb8e89d2ee4868504fc52c/packages/remix-react/components.tsx#L293-L295
    const willRemixTryToTreatAsAbsoluteAndCrash =
      !isAbsolute && (/^[a-z+]+:\/\//i.test(href) || href.startsWith("//"));

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
