import {
  forwardRef,
  type ElementRef,
  type ComponentProps,
  useContext,
} from "react";
import { Image, defaultTag } from "./image";
import { VimeoContext } from "./vimeo";

type Props = ComponentProps<typeof Image>;

export const VimeoPreviewImage = forwardRef<
  ElementRef<typeof defaultTag>,
  Props
>(({ src, ...rest }, ref) => {
  const vimeoContext = useContext(VimeoContext);

  return (
    <Image
      {...rest}
      src={String(vimeoContext.previewImageUrl ?? src)}
      ref={ref}
    />
  );
});

VimeoPreviewImage.displayName = "VimeoPreviewImage";
