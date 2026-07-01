import {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ElementRef,
  type ComponentProps,
} from "react";
import { mergeRefs } from "@react-aria/utils";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";

const defaultTag = "div";

type AnimationInstance = {
  destroy: () => void;
  setSpeed: (speed: number) => void;
  setDirection: (direction: 1 | -1) => void;
  playSegments: (segments: [number, number], force?: boolean) => void;
  goToAndStop: (value: number, isFrame?: boolean) => void;
  totalFrames: number;
  addEventListener: (name: string, callback: () => void) => void;
};

type Props = ComponentProps<typeof defaultTag> & {
  /**
   * URL to the Lottie animation JSON file.
   * Accepts any public URL, including Webstudio asset URLs.
   */
  src?: string;

  /**
   * Playback speed multiplier. 1 is normal speed, 2 is double speed.
   * @default 1
   */
  speed?: number;

  /**
   * Play the animation in reverse. Only applies in loop mode.
   * @default false
   */
  playReverse?: boolean;

  /**
   * Allow the animation to play directly on the canvas in the builder.
   * @default false
   */
  previewOnCanvas?: boolean;

  /**
   * How the animation behaves:
   * - "loop": plays and loops continuously.
   * - "toggle on click": click to toggle between open and closed.
   * - "toggle on hover": plays forward on hover, reverses on mouse out.
   * @default "loop"
   */
  behavior?: "loop" | "toggle on click" | "toggle on hover";

  /**
   * Which frame to treat as the "open" state in toggle/hover modes,
   * expressed as a percentage of the animation (0–100).
   * 100 (default) = last frame, suitable for most LottieFiles animations where
   * frame 0 is closed and the last frame is open.
   * Use 50 for hamburger-style animations where the midpoint is the open state.
   * @default 100
   */
  openAtPercent?: number;

  /**
   * Controlled open/closed state for toggle behavior.
   * When defined, overrides the internal state. Bind to a variable
   * when the animation state needs to be shared with other elements.
   */
  isOpen?: boolean;

  // lottie fills the container — children are not supported
  children?: never;
};

type Ref = ElementRef<typeof defaultTag>;

export const LottiePlayer = forwardRef<Ref, Props>(
  (
    {
      src,
      speed = 1,
      playReverse = false,
      previewOnCanvas = false,
      behavior = "loop",
      openAtPercent = 100,
      isOpen,
      children: _children,
      ...rest
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const animRef = useRef<AnimationInstance | null>(null);
    const totalFramesRef = useRef(0);
    // Tracks open state directly without React re-renders
    const openStateRef = useRef(isOpen ?? false);
    const openAtPercentRef = useRef(openAtPercent);
    openAtPercentRef.current = openAtPercent;

    const isLoopMode = behavior === "loop";
    const isToggleMode = behavior === "toggle on click";
    const isHoverMode = behavior === "toggle on hover";
    const isControlledMode = isToggleMode || isHoverMode;

    const { renderer } = useContext(ReactSdkContext);

    const playSegment = useCallback((open: boolean) => {
      const anim = animRef.current;
      const total = totalFramesRef.current;
      if (!anim || total <= 0) {
        return;
      }
      const openFrame = Math.round(
        (openAtPercentRef.current / 100) * (total - 1)
      );
      // playSegments([from, to], force) — lottie plays backwards when from > to
      anim.playSegments(open ? [0, openFrame] : [openFrame, 0], true);
    }, []);

    // Create / destroy the animation when source or display settings change
    useEffect(() => {
      const container = containerRef.current;

      if (!container || !src || (renderer === "canvas" && !previewOnCanvas)) {
        return;
      }

      let cancelled = false;

      import("lottie-web").then(({ default: lottie }) => {
        if (cancelled || !container.isConnected) {
          return;
        }

        const anim = lottie.loadAnimation({
          container,
          renderer: "svg",
          loop: isLoopMode,
          autoplay: isLoopMode,
          path: src,
        }) as AnimationInstance;

        animRef.current = anim;
        anim.setSpeed(speed);
        anim.setDirection(playReverse ? -1 : 1);

        anim.addEventListener("data_ready", () => {
          if (cancelled) {
            return;
          }
          totalFramesRef.current = anim.totalFrames;
          if (isControlledMode) {
            const openFrame = Math.round(
              (openAtPercentRef.current / 100) * (anim.totalFrames - 1)
            );
            anim.goToAndStop(openStateRef.current ? openFrame : 0, true);
          }
        });
      });

      return () => {
        cancelled = true;
        animRef.current?.destroy();
        animRef.current = null;
        totalFramesRef.current = 0;
      };
    }, [src, speed, playReverse, renderer, previewOnCanvas, behavior]);

    // Handle external isOpen prop changes (controlled mode)
    useEffect(() => {
      if (!isControlledMode || isOpen === undefined) {
        return;
      }
      openStateRef.current = isOpen;
      playSegment(isOpen);
    }, [isOpen, isControlledMode, playSegment]);

    if (!src) {
      return (
        <div
          {...rest}
          ref={ref}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            fontSize: "0.875rem",
            ...rest.style,
          }}
        >
          Open the &quot;Settings&quot; panel and paste a Lottie animation URL
        </div>
      );
    }

    if (renderer === "canvas" && !previewOnCanvas) {
      return (
        <div
          {...rest}
          ref={ref}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            padding: 20,
            textAlign: "center",
            fontSize: "0.75rem",
            ...rest.style,
          }}
        >
          <span>Lottie Animation</span>
          <span style={{ opacity: 0.5, wordBreak: "break-all" }}>{src}</span>
        </div>
      );
    }

    const handleClick =
      isToggleMode && isOpen === undefined
        ? () => {
            const newOpen = !openStateRef.current;
            openStateRef.current = newOpen;
            playSegment(newOpen);
          }
        : rest.onClick;

    const handleMouseEnter = isHoverMode
      ? () => {
          openStateRef.current = true;
          playSegment(true);
        }
      : rest.onMouseEnter;

    const handleMouseLeave = isHoverMode
      ? () => {
          openStateRef.current = false;
          playSegment(false);
        }
      : rest.onMouseLeave;

    return (
      <div
        {...rest}
        ref={mergeRefs(ref, containerRef)}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={
          isControlledMode ? { cursor: "pointer", ...rest.style } : rest.style
        }
      />
    );
  }
);

LottiePlayer.displayName = "LottiePlayer";
