import { forwardRef, type ComponentProps } from "react";
import {
  usePropUrl,
  getInstanceIdFromComponentProps,
} from "@webstudio-is/react-sdk";

export const defaultTag = "a";

type Props = Omit<ComponentProps<"a">, "target"> & {
  // override (string & {}) in target to generate keywords
  target?: "_self" | "_blank" | "_parent" | "_top";
};

export const Link = forwardRef<HTMLAnchorElement, Props>((props, ref) => {
  const href = usePropUrl(getInstanceIdFromComponentProps(props), "href");

  let url = "#";

  switch (href?.type) {
    case "page": {
      url = href.page.path === "" ? "/" : href.page.path;
      const urlTo = new URL(url, "https://any-valid.url");
      url = urlTo.pathname;

      if (href.hash !== undefined) {
        urlTo.hash = encodeURIComponent(href.hash);
        url = `${urlTo.pathname}${urlTo.hash}`;
      }
      break;
    }
    case "string":
      url = href.url;
  }

  return <a {...props} href={url} ref={ref} />;
});

Link.displayName = "Link";
