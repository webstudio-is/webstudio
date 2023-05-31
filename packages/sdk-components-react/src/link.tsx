import { forwardRef, type ComponentProps } from "react";
import {
  usePropUrl,
  getInstanceIdFromComponentProps,
  getParams,
} from "@webstudio-is/react-sdk";

export const defaultTag = "a";

// @todo props that come from remix link, shouldn't be here at all
// - prefetch should be only on remix component and it already is
// - props meta should be generated from Remix link
// - changing this requires update in app/canvas/custom-components/link.tsx
type Props = Omit<ComponentProps<"a">, "href" | "target"> & {
  href?: string;
  target?: "_self" | "_blank" | "_parent" | "_top";
  prefetch?: "none" | "intent" | "render";
};

export const Link = forwardRef<HTMLAnchorElement, Props>((props, ref) => {
  const href = usePropUrl(getInstanceIdFromComponentProps(props), "href");

  const { assetBaseUrl } = getParams();

  let url = "#";

  switch (href?.type) {
    case "page":
      url = href.page.path === "" ? "/" : href.page.path;
      if (href.hash !== undefined) {
        url += `#${href.hash}`;
      }
      break;
    case "asset":
      url = `${assetBaseUrl}${href.asset.name}`;
      break;
    case "string":
      url = href.url;
  }

  return <a {...props} href={url} ref={ref} />;
});

Link.displayName = "Link";
