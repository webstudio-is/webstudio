import {
  forwardRef,
  useMemo,
  type ComponentProps,
  type ElementRef,
} from "react";
import { Image as WebstudioImage, loaders } from "@webstudio-is/image";
import { useUserPropsAsset } from "~/user-props/use-user-props-asset";
import { idAttribute } from "~/tree/wrapper-component";

const defaultTag = "img";

type Props = ComponentProps<typeof WebstudioImage> & { [idAttribute]: string };

const params = {
  resizeOrigin: "https://webstudio.is",
};
/**
 * @todo read params from data
 **/
const useParams = () => {
  return params;
};

export const Component = forwardRef<ElementRef<typeof defaultTag>, Props>(
  (props, ref) => {
    const componentId = props[idAttribute] as string;

    const asset = useUserPropsAsset(componentId, "src");
    const params = useParams();

    const loader = useMemo(() => {
      if (asset == null) return null;
      if (asset.location === "REMOTE")
        return loaders.cloudflareImageLoader(params);
      return loaders.localImageLoader();
    }, [asset, params]);

    if (asset === null || loader == null)
      return <WebstudioImage {...props} ref={ref} />;

    return (
      <WebstudioImage {...props} loader={loader} optimize={true} ref={ref} />
    );
  }
);

Component.displayName = "Image";
