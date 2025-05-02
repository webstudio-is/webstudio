import type { ImageLoader } from "@webstudio-is/image";
import type { PageMeta } from "@webstudio-is/sdk";
import { useEffect, useState } from "react";

type MetaProps = {
  property?: string;
  name?: string;
  content: string;
};

// Not documented
export const isElementRenderedWithReact = (element: Element) => {
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
const Meta = (props: MetaProps) => {
  const [localProps, setLocalProps] = useState<MetaProps | undefined>();

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

export const PageSettingsMeta = ({
  url,
  host,
  siteName,
  pageMeta,
  imageLoader,
}: {
  url?: string;
  host: string;
  siteName: string;
  pageMeta: PageMeta;
  imageLoader: ImageLoader;
}) => {
  const metas: // | { title: string }
  { property?: string; name?: string; content: string }[] = [];

  if (url !== undefined) {
    metas.push({
      property: "og:url",
      content: url,
    });
  }

  if (pageMeta.title) {
    metas.push({
      property: "og:title",
      content: pageMeta.title,
    });
  }

  metas.push({ property: "og:type", content: "website" });

  if (siteName) {
    metas.push({
      property: "og:site_name",
      content: siteName,
    });
  }

  if (pageMeta.excludePageFromSearch) {
    metas.push({
      name: "robots",
      content: "noindex, nofollow",
    });
  }

  if (pageMeta.description) {
    metas.push({
      name: "description",
      content: pageMeta.description,
    });
    metas.push({
      property: "og:description",
      content: pageMeta.description,
    });
  }

  if (pageMeta.socialImageAssetName) {
    metas.push({
      property: "og:image",
      content: `https://${host}${imageLoader({
        src: pageMeta.socialImageAssetName,
        // Do not transform social image (not enough information do we need to do this)
        format: "raw",
      })}`,
    });
  } else if (pageMeta.socialImageUrl) {
    metas.push({
      property: "og:image",
      content: pageMeta.socialImageUrl,
    });
  }

  metas.push(...pageMeta.custom);

  return metas.map((meta, index) => <Meta key={index} {...meta} />);
};
