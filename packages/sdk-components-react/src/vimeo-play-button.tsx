import {
  forwardRef,
  type ElementRef,
  type ComponentProps,
  useContext,
  useCallback,
} from "react";
import { VimeoContext } from "./vimeo";
import { Button, defaultTag } from "./button";
import interactionResponse from "await-interaction-response";

export { defaultTag };

type Props = ComponentProps<typeof Button>;

export const VimeoPlayButton = forwardRef<ElementRef<typeof defaultTag>, Props>(
  (props, ref) => {
    const vimeoContext = useContext(VimeoContext);

    const handleClick = useCallback(async () => {
      await interactionResponse();
      vimeoContext.onInitPlayer();
    }, [vimeoContext]);

    if (vimeoContext.status !== "initial") {
      return;
    }

    return <Button {...props} onClick={handleClick} ref={ref} />;
  }
);

VimeoPlayButton.displayName = "VimeoPlayButton";
