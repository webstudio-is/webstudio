import { canvasAssetIdAttribute } from "@webstudio-is/react-sdk";
import { forwardRef, type ComponentProps } from "react";

export const defaultTag = "a";

type Props = Omit<ComponentProps<"a">, "target" | "download"> & {
  // override (string & {}) in target to generate keywords
  target?: "_self" | "_blank" | "_parent" | "_top";
  download?: boolean;
};

export const Link = forwardRef<
  HTMLAnchorElement,
  Props & { [canvasAssetIdAttribute]?: string }
>(({ children, [canvasAssetIdAttribute]: canvasAssetId, ...props }, ref) => {
  return (
    <a {...props} href={props.href ?? "#"} ref={ref}>
      {children}
    </a>
  );
});

Link.displayName = "Link";
