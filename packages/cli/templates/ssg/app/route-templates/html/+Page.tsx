import type { PageContext } from "vike/types";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import { assetBaseUrl, imageLoader } from "__CONSTANTS__";
import { Page } from "__CLIENT__";

const PageComponent = ({ data }: { data: PageContext["data"] }) => {
  const { system, resources, url } = data;
  return (
    <ReactSdkContext.Provider
      value={{
        imageLoader,
        assetBaseUrl,
        resources,
      }}
    >
      {/* Use the URL as the key to force scripts in HTML Embed to reload on dynamic pages */}
      <Page key={url} system={system} />
    </ReactSdkContext.Provider>
  );
};
export default PageComponent;
