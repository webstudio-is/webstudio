import {
  forwardRef,
  type ElementRef,
  type ComponentProps,
  useContext,
  useCallback,
} from "react";
import interactionResponse from "await-interaction-response";
import { Button, defaultTag } from "./button";
import { VideoContext } from "./shared/video";

export { defaultTag };

type Props = ComponentProps<typeof Button>;

export const VimeoPlayButton = forwardRef<ElementRef<typeof defaultTag>, Props>(
  (props, ref) => {
    const videoContext = useContext(VideoContext);

    const handleClick = useCallback(async () => {
      await interactionResponse();
      videoContext.onInitPlayer();
    }, [videoContext]);

    if (videoContext.status !== "initial") {
      return;
    }

    return <Button {...props} onClick={handleClick} ref={ref} />;
  }
);

VimeoPlayButton.displayName = "VimeoPlayButton";
