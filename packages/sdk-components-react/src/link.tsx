import { forwardRef, type ComponentProps } from "react";

export const defaultTag = "a";

type Props = Omit<ComponentProps<"a">, "target" | "download"> & {
  // override (string & {}) in target to generate keywords
  target?: "_self" | "_blank" | "_parent" | "_top";
  download?: boolean;
  prefetch?: "none" | "intent" | "render" | "viewport";
  preventScrollReset?: boolean;
  reloadDocument?: boolean;
  replace?: boolean;
};

export const Link = forwardRef<
  HTMLAnchorElement,
  Props & { $webstudio$canvasOnly$assetId?: string | undefined }
>((props, ref) => {
  const {
    children,
    // @todo: it's a hack made for Image component for the builder and should't be in the runtime at all.
    $webstudio$canvasOnly$assetId,
    ...rest
  } = props;
  return (
    <a {...rest} href={rest.href ?? "#"} ref={ref}>
      {children}
    </a>
  );
});

Link.displayName = "Link";
