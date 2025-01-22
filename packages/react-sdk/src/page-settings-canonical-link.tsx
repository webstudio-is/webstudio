import { useEffect, useState } from "react";
import { isElementRenderedWithReact } from "./page-settings-meta";

type PageSettingsCanonicalLinkProps = {
  href: string;
};

const isServer = typeof window === "undefined";

/**
 * Link canonical tag are deduplicated on the server using the HTMLRewriter interface.
 * This is not full deduplication. We simply skip rendering Page Setting link
 * if it has already been rendered using HeadSlot/HeadLink.
 * To prevent React on the client from re-adding the removed link tag, we skip rendering them client-side.
 * This approach works because React retains server-rendered link tag as long as they are not re-rendered by the client.
 *
 * The following component behavior ensures this:
 * 1. On the server: Render link tag as usual.
 * 2. On the client: Before rendering, remove any link tag with the same `name` or `property` that were not rendered by Client React,
 *    and then proceed with rendering as usual.
 */
export const PageSettingsCanonicalLink = (
  props: PageSettingsCanonicalLinkProps
) => {
  const [localProps, setLocalProps] = useState<
    PageSettingsCanonicalLinkProps | undefined
  >();

  useEffect(() => {
    const selector = `head > link[rel="canonical"]`;
    let allLinks = document.querySelectorAll(selector);

    for (const meta of allLinks) {
      if (!isElementRenderedWithReact(meta)) {
        meta.remove();
      }
    }

    allLinks = document.querySelectorAll(selector);

    if (allLinks.length === 0) {
      setLocalProps(props);
    }
  }, [props]);

  if (isServer) {
    return <link rel="canonical" {...props} />;
  }

  if (localProps === undefined) {
    // This method also works during hydration because React retains server-rendered tags
    // as long as they are not re-rendered by the client.
    return;
  }

  return <link rel="canonical" {...localProps} />;
};
