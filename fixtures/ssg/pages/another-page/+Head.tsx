import type { PageContext } from "vike/types";
import { assetBaseUrl, imageLoader } from "../../app/constants.mjs";
import {
  favIconAsset,
  pageBackgroundImageAssets,
  pageFontAssets,
  siteName,
} from "../../app/__generated__/[another-page]._index";
import "../../app/__generated__/index.css";

export const Head = ({ data }: { data: PageContext["data"] }) => {
  const { pageMeta } = data;
  const { origin } = new URL(data.url);
  const ldJson = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: origin,
  };
  let socialImageUrl = pageMeta.socialImageUrl;
  if (pageMeta.socialImageAssetName) {
    socialImageUrl = `${origin}${imageLoader({
      src: pageMeta.socialImageAssetName,
      // Do not transform social image (not enough information do we need to do this)
      format: "raw",
    })}`;
  }
  return (
    <>
      {data.url && <meta property="og:url" content={data.url} />}
      <title>{pageMeta.title}</title>
      <meta property="og:title" content={pageMeta.title} />
      {pageMeta.description && (
        <>
          <meta name="description" content={pageMeta.description} />
          <meta property="og:description" content={pageMeta.description} />
        </>
      )}
      <meta property="og:type" content="website" />
      {siteName && <meta property="og:site_name" content={siteName} />}
      {socialImageUrl && (
        <meta property="og:image" content={pageMeta.socialImageUrl} />
      )}
      {siteName && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(ldJson, null, 2),
          }}
        ></script>
      )}
      {pageMeta.excludePageFromSearch && (
        <meta name="robots" content="noindex, nofollow" />
      )}
      {pageMeta.custom.map(({ property, content }) => (
        <meta key={property} property={property} content={content} />
      ))}

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
