import type { PageMeta } from "@webstudio-is/sdk";
import { useEffect, useState } from "react";
import { isElementRenderedWithReact } from "./page-settings-meta";

const isServer = typeof window === "undefined";

/**
 * Script tags for JSON-LD are handled similarly to meta tags.
 * We deduplicate on the server using the HTMLRewriter interface.
 * To prevent React on the client from re-adding removed scripts, we skip rendering them client-side.
 */
const Script = ({
  type,
  content,
}: {
  type: "application/ld+json";
  content: string;
}) => {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Check if this script was already rendered by the server
    // We identify scripts by their content hash
    const selector = `script[type="application/ld+json"]`;
    const allScripts = document.querySelectorAll(selector);

    for (const script of allScripts) {
      if (
        !isElementRenderedWithReact(script) &&
        script.textContent === content
      ) {
        // Server-rendered duplicate found, don't render
        return;
      }
    }

    // No server-rendered duplicate, we should render
    setShouldRender(true);
  }, [content]);

  if (isServer) {
    return (
      <script
        type={type}
        dangerouslySetInnerHTML={{
          __html: content,
        }}
      />
    );
  }

  if (shouldRender === false) {
    return null;
  }

  return (
    <script
      type={type}
      dangerouslySetInnerHTML={{
        __html: content,
      }}
    />
  );
};

export const PageSettingsSchemaMarkup = ({
  pageMeta,
}: {
  pageMeta: PageMeta;
}) => {
  return (
    <>
      {pageMeta.schemaMarkup?.map((script, index) => (
        <Script key={index} type={script.type} content={script.content} />
      ))}
    </>
  );
};
