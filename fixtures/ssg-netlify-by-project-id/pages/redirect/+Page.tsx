import { type ComponentProps, memo, useMemo } from "react";
import type { PageContext } from "vike/types";
import {
  PageSettingsMeta,
  PageSettingsTitle,
  ReactSdkContext,
} from "@webstudio-is/react-sdk/runtime";
import { LinkCurrentUrlContext } from "@webstudio-is/sdk-components-react";
import { assetBaseUrl, imageLoader } from "../../app/constants.mjs";
import {
  Page,
  breakpoints,
  siteName,
} from "../../app/__generated__/[redirect]._index";

const getPageKey = (url: string) => {
  const { origin, pathname, search } = new URL(url);
  return `${origin}${pathname}${search}`;
};

const PageBoundary = memo(
  ({ pageKey, system }: ComponentProps<typeof Page> & { pageKey: string }) => {
    // Use the URL as the key to force scripts in HTML Embed to reload on dynamic pages
    return <Page key={pageKey} system={system} />;
  },
  // Vike can rerender the current page during client-side navigation and
  // hash-only URL updates. Keep the generated page out of that render path,
  // but let actual page URL changes remount it.
  (prevProps, nextProps) => prevProps.pageKey === nextProps.pageKey
);

const PageComponent = ({ data }: { data: PageContext["data"] }) => {
  const { system, resources, url, pageMeta } = data;
  const pageKey = getPageKey(url);
  const sdkContext = useMemo(
    () => ({
      imageLoader,
      assetBaseUrl,
      resources,
      breakpoints,
      onError: console.error,
    }),
    [resources]
  );

  return (
    <ReactSdkContext.Provider value={sdkContext}>
      <LinkCurrentUrlContext.Provider value={url}>
        <PageBoundary pageKey={pageKey} system={system} />
      </LinkCurrentUrlContext.Provider>
      <PageSettingsMeta
        url={url}
        pageMeta={pageMeta}
        siteName={siteName}
        imageLoader={imageLoader}
        assetBaseUrl={assetBaseUrl}
      />
      <PageSettingsTitle>{pageMeta.title}</PageSettingsTitle>
    </ReactSdkContext.Provider>
  );
};
export default PageComponent;
