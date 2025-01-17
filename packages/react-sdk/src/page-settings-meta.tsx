import { useEffect, useState } from "react";

type PageSettingsMetaProps = {
  property?: string;
  name?: string;
  content: string;
};

// Not documented
const isElementRenderedWithReact = (element: Element) => {
  return Object.keys(element).some((key) => key.startsWith("__react"));
};

const isServer = typeof window === "undefined";

/**
 * Meta tags are deduplicated on the server using the HTMLRewriter interface.
 * This is not full deduplication. We simply skip rendering Page Setting meta
 * if it has already been rendered using HeadSlot/HeadMeta.
 * To prevent React on the client from re-adding the removed meta tags, we skip rendering them client-side.
 * This approach works because React retains server-rendered meta tags as long as they are not re-rendered by the client.
 *
 * The following component behavior ensures this:
 * 1. On the server: Render meta tags as usual.
 * 2. On the client: Before rendering, remove any meta tags with the same `name` or `property` that were not rendered by Client React,
 *    and then proceed with rendering as usual.
 */
export const PageSettingsMeta = (props: PageSettingsMetaProps) => {
  const [localProps, setLocalProps] = useState<
    PageSettingsMetaProps | undefined
  >();

  useEffect(() => {
    const selector = `meta[${props.name ? `name="${props.name}"` : `property="${props.property}"`}]`;
    let allMetas = document.querySelectorAll(selector);

    for (const meta of allMetas) {
      if (!isElementRenderedWithReact(meta)) {
        meta.remove();
      }
    }

    allMetas = document.querySelectorAll(selector);

    if (allMetas.length === 0) {
      setLocalProps(props);
    }
  }, [props]);

  if (isServer) {
    return <meta {...props} />;
  }

  if (localProps === undefined) {
    // This method also works during hydration because React retains server-rendered tags
    // as long as they are not re-rendered by the client.
    return;
  }

  return <meta {...localProps} />;
};
