import { forwardRef, type ComponentProps } from "react";
import {
  usePropUrl,
  getInstanceIdFromComponentProps,
  getParams,
} from "@webstudio-is/react-sdk";

export const defaultTag = "a";

type Props = Omit<ComponentProps<"a">, "target"> & {
  // override (string & {}) in target to generate keywords
  target?: "_self" | "_blank" | "_parent" | "_top";
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
