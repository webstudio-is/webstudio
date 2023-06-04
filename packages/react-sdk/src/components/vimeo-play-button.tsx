import {
  forwardRef,
  type ElementRef,
  type ComponentProps,
  useContext,
} from "react";
import { VimeoContext } from "./vimeo";
import { Button, defaultTag } from "./button";

type Props = ComponentProps<typeof Button>;

export const VimeoPlayButton = forwardRef<ElementRef<typeof defaultTag>, Props>(
  (props, ref) => {
    const vimeoContext = useContext(VimeoContext);
    return <Button {...props} onClick={vimeoContext.initialize} ref={ref} />;
  }
);

VimeoPlayButton.displayName = "VimeoPlayButton";
