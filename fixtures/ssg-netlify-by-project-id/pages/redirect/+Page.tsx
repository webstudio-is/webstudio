import type { PageContext } from "vike/types";
import {
  PageSettingsMeta,
  PageSettingsTitle,
  ReactSdkContext,
} from "@webstudio-is/react-sdk/runtime";
import { assetBaseUrl, imageLoader } from "../../app/constants.mjs";
import {
  Page,
  breakpoints,
  siteName,
} from "../../app/__generated__/[redirect]._index";

const PageComponent = ({ data }: { data: PageContext["data"] }) => {
  const { system, resources, url, pageMeta } = data;
  return (
    <ReactSdkContext.Provider
      value={{
        imageLoader,
        assetBaseUrl,
        resources,
        breakpoints,
        onError: console.error,
      }}
    >
      {/* Use the URL as the key to force scripts in HTML Embed to reload on dynamic pages */}
      <Page key={url} system={system} />
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
