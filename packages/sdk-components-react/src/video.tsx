import {
  forwardRef,
  type ElementRef,
  type ComponentProps,
  useEffect,
  useId,
  useContext,
} from "react";
import type { Atom } from "nanostores";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";

export const defaultTag = "video";

// To avoid composing refs
const videoIdAttribute = "data-ws-video-id";

const READY_STATE = {
  HAVE_NOTHING: 0,
  HAVE_METADATA: 1,
  HAVE_CURRENT_DATA: 2,
  HAVE_FUTURE_DATA: 3,
  HAVE_ENOUGH_DATA: 4,
};

export const Video = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag> & {
    $progress?: Atom<number | undefined>;
    $visible?: Atom<boolean>;
    $timeline?: boolean;
  } & {
    $webstudio$canvasOnly$assetId?: string | undefined;
  }
>(
  (
    {
      $progress,
      $visible,
      $timeline,
      $webstudio$canvasOnly$assetId: _,
      children,
      src: srcProp,
      ...props
    },
    ref
  ) => {
    const id = useId();
    const videoIdProps = {
      [videoIdAttribute]: id,
    };
    const { videoLoader } = useContext(ReactSdkContext);

    // fallback to provided src
    const src =
      srcProp && videoLoader ? videoLoader({ src: srcProp }) : srcProp;

    useEffect(() => {
      if ($progress === undefined) {
        return;
      }

      if ($visible === undefined) {
        return;
      }

      const video = document.querySelector(`[${videoIdAttribute}="${id}"]`);

      if (video === null) {
        return;
      }

      if (false === video instanceof HTMLVideoElement) {
        return;
      }

      // Safari IOS does not seek video without play called at least once
      // this is in case autoPlay is not set
      video.play().catch(() => {
        /**/
      });
      video.pause();

      if ($timeline) {
        return $progress.subscribe((progress) => {
          if (video.readyState < READY_STATE.HAVE_METADATA) {
            return;
          }

          if (!video.paused) {
            video.pause();
          }

          if (video.seeking) {
            return;
          }

          let duration = video.duration;

          if (Number.isNaN(duration)) {
            return;
          }

          if (!Number.isFinite(duration)) {
            // Set to 60s on streaming videos
            duration = 60;
          }

          video.currentTime = (progress ?? 0) * duration;
        });
      }

      let isPlaying = false;
      let isVisible = false;

      const unsubscribeVisible = $visible.subscribe((visible) => {
        isVisible = visible;

        // Seek video only if it's invisible to avoid jumps
        if (isVisible === false && isPlaying === false && !video.loop) {
          video.currentTime = 0;
        }
      });

      const unsubscribeProgress = $progress.subscribe((progress) => {
        if (
          isPlaying &&
          (progress === undefined || progress === 0 || progress === 1)
        ) {
          isPlaying = false;
          video.pause();

          // Seek video only if it's invisible to avoid jumps
          if (isVisible === false && isPlaying === false && !video.loop) {
            video.currentTime = 0;
          }

          return;
        }

        if (!isPlaying) {
          isPlaying = true;
          if (!video.ended) {
            video.play().catch(() => {
              /**/
            });
          }
        }
      });

      return () => {
        unsubscribeProgress();
        unsubscribeVisible();
      };
    }, [$progress, $timeline, $visible, id]);

    return (
      <video src={src} {...props} {...videoIdProps} ref={ref}>
        {children}
      </video>
    );
  }
);

Video.displayName = "Video";
