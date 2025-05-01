import {
  forwardRef,
  type ElementRef,
  type ComponentProps,
  useContext,
} from "react";
import { VideoContext } from "./shared/video";

const defaultTag = "div";

type Props = ComponentProps<typeof defaultTag>;

export const VimeoSpinner = forwardRef<ElementRef<typeof defaultTag>, Props>(
  (props, ref) => {
    const videoContext = useContext(VideoContext);

    if (videoContext.status !== "loading") {
      return;
    }

    return <div {...props} ref={ref} />;
  }
);

VimeoSpinner.displayName = "VimeoSpinner";
