import { useEffect, useState } from "react";
import { isElementRenderedWithReact } from "./page-settings-meta";

type PageSettingsTitleProps = {
  children: string;
};

const isServer = typeof window === "undefined";

/**
 * Title tags are deduplicated on the server using the HTMLRewriter interface.
 * This is not full deduplication. We simply skip rendering Page Setting title
 * if it has already been rendered using HeadSlot/HeadTitle.
 * To prevent React on the client from re-adding the removed title tag, we skip rendering them client-side.
 * This approach works because React retains server-rendered title tag as long as they are not re-rendered by the client.
 *
 * The following component behavior ensures this:
 * 1. On the server: Render title tag as usual.
 * 2. On the client: Before rendering, remove any title tag with the same `name` or `property` that were not rendered by Client React,
 *    and then proceed with rendering as usual.
 */
export const PageSettingsTitle = (props: PageSettingsTitleProps) => {
  const [localProps, setLocalProps] = useState<
    PageSettingsTitleProps | undefined
  >();

  useEffect(() => {
    const selector = `head > title`;
    let allTitles = document.querySelectorAll(selector);

    for (const meta of allTitles) {
      if (!isElementRenderedWithReact(meta)) {
        meta.remove();
      }
    }

    allTitles = document.querySelectorAll(selector);

    if (allTitles.length === 0) {
      setLocalProps(props);
    }
  }, [props]);

  if (isServer) {
    return <title {...props} />;
  }

  if (localProps === undefined) {
    // This method also works during hydration because React retains server-rendered tags
    // as long as they are not re-rendered by the client.
    return;
  }

  return <title {...localProps} />;
};
