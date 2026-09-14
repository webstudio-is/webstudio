import {
  forwardRef,
  useContext,
  type ComponentProps,
  type ComponentRef,
} from "react";
import { useStore } from "@nanostores/react";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import { HtmlEmbed } from "@webstudio-is/sdk-components-react/components";
import { $resourcesState } from "~/shared/resources";

export const CanvasHtmlEmbed = forwardRef<
  ComponentRef<typeof HtmlEmbed>,
  ComponentProps<typeof HtmlEmbed>
>((props, ref) => {
  const resourcesState = useStore($resourcesState);
  const sdkContext = useContext(ReactSdkContext);

  if (resourcesState === "settled") {
    return <HtmlEmbed {...props} ref={ref} />;
  }

  return (
    <ReactSdkContext.Provider value={{ ...sdkContext, isSafeMode: true }}>
      <HtmlEmbed {...props} ref={ref} />
    </ReactSdkContext.Provider>
  );
});

CanvasHtmlEmbed.displayName = "CanvasHtmlEmbed";
