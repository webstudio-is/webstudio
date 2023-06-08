import {
  forwardRef,
  type ElementRef,
  type ComponentProps,
  useContext,
} from "react";
import { VimeoContext } from "./vimeo";

const defaultTag = "div";

type Props = ComponentProps<typeof defaultTag>;

export const VimeoSpinner = forwardRef<ElementRef<typeof defaultTag>, Props>(
  (props, ref) => {
    const vimeoContext = useContext(VimeoContext);

    if (vimeoContext.status !== "initialized") {
      return null;
    }

    return <div {...props} ref={ref} />;
  }
);

VimeoSpinner.displayName = "VimeoSpinner";
