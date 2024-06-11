import { useStore } from "@nanostores/react";

import { Image as WebstudioImage } from "@webstudio-is/image";

import { $imageLoader } from "~/shared/nano-states";

type ImageProps = {
  assetId: string;
  objectURL: string | undefined;
  name: string;
  alt: string;
  width: number;
  className?: string;
};

export const Image = ({
  className,
  objectURL,
  assetId,
  name,
  alt,
  width,
}: ImageProps) => {
  const optimize = objectURL === undefined;
  const imageLoader = useStore($imageLoader);

  // Avoid image flickering on switching from preview to asset (during upload)
  // Possible optimisation, we can set it to "sync" only if asset.path has changed or add isNew prop to UploadedAssetContainer
  const decoding = "sync";

  const src = objectURL ?? name;

  return (
    <WebstudioImage
      className={className}
      style={{
        // Prevent native image drag in Image Manager to avoid issues with monitorForExternal
        // from @atlaskit/pragmatic-drag-and-drop, which incorrectly identifies it as an external drag operation
        // when used inside an iframe.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        WebkitUserDrag: "none",
        maxWidth: "100%",
      }}
      key={assetId}
      loader={imageLoader}
      decoding={decoding}
      src={src}
      width={width}
      optimize={optimize}
      alt={alt}
    />
  );
};
