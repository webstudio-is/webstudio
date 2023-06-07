import {
  forwardRef,
  type ElementRef,
  type ComponentProps,
  useContext,
} from "react";
import { Image, defaultTag } from "./image";
import { VimeoContext } from "./vimeo";

// Generated using https://png-pixel.com/
const base64Preview = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkOAMAANIAzr59FiYAAAAASUVORK5CYII=`;

type Props = ComponentProps<typeof Image>;

export const VimeoPreviewImage = forwardRef<
  ElementRef<typeof defaultTag>,
  Props
>(({ src, ...rest }, ref) => {
  const vimeoContext = useContext(VimeoContext);

  return (
    <Image
      {...rest}
      src={String(vimeoContext.previewImageUrl ?? src ?? base64Preview)}
      ref={ref}
    />
  );
});

VimeoPreviewImage.displayName = "VimeoPreviewImage";
