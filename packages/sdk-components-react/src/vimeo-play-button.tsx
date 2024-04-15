import {
  forwardRef,
  type ElementRef,
  type ComponentProps,
  useContext,
} from "react";
import { VimeoContext } from "./vimeo";
import { Button, defaultTag } from "./button";

export { defaultTag };

type Props = ComponentProps<typeof Button>;

export const VimeoPlayButton = forwardRef<ElementRef<typeof defaultTag>, Props>(
  (props, ref) => {
    const vimeoContext = useContext(VimeoContext);
    if (vimeoContext.status !== "initial") {
      return;
    }
    return <Button {...props} onClick={vimeoContext.onInitPlayer} ref={ref} />;
  }
);

VimeoPlayButton.displayName = "VimeoPlayButton";
