import {
  forwardRef,
  useMemo,
  type ComponentProps,
  type ElementRef,
} from "react";
import { Image as WebstudioImage, loaders } from "@webstudio-is/image";
import { Image as SdkImage } from "../../components/image";
import { useUserPropsAsset } from "../../user-props/use-user-props-asset";
import { idAttribute } from "../../tree/wrapper-component";
import { getParams } from "../params";

const defaultTag = "img";

type Props = ComponentProps<typeof WebstudioImage> & { [idAttribute]: string };

export const Image = forwardRef<ElementRef<typeof defaultTag>, Props>(
  (props, ref) => {
    const componentId = props[idAttribute] as string;

    const asset = useUserPropsAsset(componentId, "src");
    const params = getParams();

    const loader = useMemo(() => {
      if (asset == null) return null;
      if (asset.location === "REMOTE")
        return loaders.cloudflareImageLoader(params);
      return loaders.localImageLoader();
    }, [asset, params]);

    if (asset === null || loader == null)
      return <SdkImage {...props} ref={ref} />;

    return (
      <WebstudioImage {...props} loader={loader} optimize={true} ref={ref} />
    );
  }
);

Image.displayName = "Image";
