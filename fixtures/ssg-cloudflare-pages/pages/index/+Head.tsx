import type { PageContext } from "vike/types";
import { assetBaseUrl, imageLoader } from "../../app/constants.mjs";
import {
  favIconAsset,
  pageBackgroundImageAssets,
  pageFontAssets,
  siteName,
} from "../../app/__generated__/_index";

export const Head = ({}: { data: PageContext["data"] }) => {
  const ldJson = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
  };
  return (
    <>
      <link rel="stylesheet" href="/__webstudio/css/index.60b4b3c438ed.css" />
      {siteName && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(ldJson, null, 2),
          }}
        ></script>
      )}
      {favIconAsset && (
        <link
          rel="icon"
          href={imageLoader({
            src: `${assetBaseUrl}${favIconAsset}`,
            // width,height must be multiple of 48 https://developers.google.com/search/docs/appearance/favicon-in-search
            width: 144,
            height: 144,
            fit: "pad",
            quality: 100,
            format: "auto",
          })}
        />
      )}
      {pageFontAssets.map((asset) => (
        <link
          key={asset}
          rel="preload"
          href={`${assetBaseUrl}${asset}`}
          as="font"
          crossOrigin="anonymous"
        />
      ))}
      {pageBackgroundImageAssets.map((asset) => (
        <link
          key={asset}
          rel="preload"
          href={`${assetBaseUrl}${asset}`}
          as="image"
        />
      ))}
    </>
  );
};
