import {
  forwardRef,
  type ElementRef,
  type ComponentProps,
  useContext,
} from "react";
import { Box, defaultTag } from "./box";
import { VimeoContext } from "./vimeo";

type Props = ComponentProps<typeof Box>;

export const VimeoSpinner = forwardRef<ElementRef<typeof defaultTag>, Props>(
  (props, ref) => {
    const vimeoContext = useContext(VimeoContext);

    if (vimeoContext.status !== "initialized") {
      return null;
    }

    return <Box {...props} ref={ref} />;
  }
);

VimeoSpinner.displayName = "VimeoSpinner";
