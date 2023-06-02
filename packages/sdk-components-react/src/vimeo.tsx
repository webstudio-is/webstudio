import {
  forwardRef,
  useState,
  useRef,
  useEffect,
  type ElementRef,
  type ComponentProps,
} from "react";

const defaultTag = "div";

// https://developer.vimeo.com/player/sdk/embed
export type VimeoPlayerOptions = {
  /** The ID or the URL of the video on Vimeo. You must supply one of these values to identify the video. When the video's privacy setting is Private, you must use the URL, and the URL must include the h parameter. For more information, see our introductory guide. */
  url?: string;
  /** Whether to pause the current video when another Vimeo video on the same page starts to play. Set this value to false to permit simultaneous playback of all the videos on the page. This option has no effect if you've disabled cookies in your browser, either through browser settings or with an extension or plugin. */
  autopause?: boolean;
  /** Whether to enable the browser to enter picture-in-picture mode automatically when switching tabs or windows, where supported. */
  autopip?: boolean;
  /** Whether to start playback of the video automatically. This feature might not work on all devices. */
  autoplay?: boolean;
  /** Whether the player is in background mode, which hides the playback controls, enables autoplay, and loops the video. */
  background?: boolean;
  /** Whether to display the video owner's name. */
  byline?: boolean;
  /** The hexadecimal color value of the playback controls, which is normally 00ADEF. The embed settings of the video might override this value. */
  color?: string;
  /** true	Whether to display the player's interactive elements, including the play bar and sharing buttons. Set this option to false for a chromeless experience. To control playback when the play/pause button is hidden, set autoplay to true, use keyboard controls (which remain active), or implement our player SDK. */
  controls?: boolean;
  /** Whether to prevent the player from tracking session data, including cookies. Keep in mind that setting this argument to true also blocks video stats. */
  doNotTrack?: boolean;
  /** Key-value pairs representing dynamic parameters that are utilized on interactive videos with live elements, such as title=my-video,subtitle=interactive. */
  interactive_params?: string;
  /** Whether to enable keyboard input to trigger player events. This setting doesn't affect tab control. */
  keyboard?: boolean;
  /** Whether to restart the video automatically after reaching the end. */
  loop?: boolean;
  /** Whether the video is muted upon loading. The true value is required for the autoplay behavior in some browsers. */
  muted?: boolean;
  /** Whether to include the picture-in-picture button among the player controls and enable the picture-in-picture API. */
  pip?: boolean;
  /** Whether the video plays inline on supported mobile devices. To force the device to play the video in fullscreen mode instead, set this value to false. */
  playsinline?: boolean;
  /** Whether to display the video owner's portrait. */
  portrait?: boolean;
  /** For videos on a Vimeo Plus account or higher: the playback quality of the video. Use auto for the best possible quality given available bandwidth and other factors. You can also specify 360p, 540p, 720p, 1080p, 2k, and 4k. */
  quality?: "auto" | "360p" | "540p" | "720p" | "1080p" | "2k" | "4k";
  /** Whether to return a responsive embed code, or one that provides intelligent adjustments based on viewing conditions. We recommend this option for mobile-optimized sites. */
  responsive?: boolean;
  /** Whether the player displays speed controls in the preferences menu and enables the playback rate API. */
  speed?: boolean;
  /**
   * The text track to display with the video. Specify the text track by its language code (en), the language code and locale (en-US), or the language code and kind (en.captions). For this argument to work, the video must already have a text track of the given type; see our Help Center or Working with Text Track Uploads for more information.
   * To enable automatically generated closed captions instead, provide the value en-x-autogen. Please note that, at the present time, automatic captions are always in English.
   */
  texttrack?: string;
  /** Whether the player displays the title overlay. */
  title?: boolean;
  /** Whether the responsive player and transparent background are enabled. */
  transparent?: boolean;
};

const getUrl = (options: VimeoPlayerOptions) => {
  if (options.url === undefined) {
    return;
  }
  const url = new URL(options.url);
  let option: keyof VimeoPlayerOptions;
  for (option in options) {
    if (option === "url") {
      continue;
    }
    const value = options[option];
    if (value === undefined) {
      continue;
    }
    if (option === "doNotTrack") {
      // We are mapping it because we made it human readable
      url.searchParams.append("dnt", value.toString());
      continue;
    }
    if (option === "autoplay") {
      // We always set autoplay to true because we have a button that starts the video
      url.searchParams.append("autoplay", "true");
      continue;
    }
    url.searchParams.append(option, value.toString());
  }
  return url.toString();
};

const createPlayer = (
  parent: Element,
  options: VimeoPlayerOptions,
  callback: () => void
) => {
  const url = getUrl(options);
  if (url === undefined) {
    return;
  }
  const iframe = document.createElement("iframe");
  iframe.setAttribute(
    "allow",
    "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture;"
  );
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute("allowfullscreen", "true");
  iframe.setAttribute("src", url);
  iframe.setAttribute(
    "style",
    // float: left is a hack to remove a newline after the iframe
    "display: block; width: 100%; height: 100%; visibility: hidden;"
  );
  iframe.addEventListener(
    "load",
    () => {
      iframe.style.visibility = "visible";
      callback();
    },
    { once: true }
  );
  parent.appendChild(iframe);

  return () => {
    iframe.parentElement?.removeChild(iframe);
  };
};

type Props = Omit<ComponentProps<typeof defaultTag>, keyof VimeoPlayerOptions> &
  VimeoPlayerOptions & { initialState?: "initial" | "loading" | "player" };
type Ref = ElementRef<typeof defaultTag>;

export const Vimeo = forwardRef<Ref, Props>(
  (
    {
      url,
      autoplay = false,
      autopause = true,
      background = false,
      byline = false,
      controls = true,
      doNotTrack = false,
      keyboard = true,
      loop = false,
      muted = false,
      pip = false,
      playsinline = true,
      portrait = true,
      quality = "auto",
      responsive = true,
      speed = false,
      title = false,
      transparent = true,
      autopip,
      color,
      interactive_params,
      texttrack,
      children,
      initialState = "initial",
      ...rest
    },
    ref
  ) => {
    const [state, setState] = useState(initialState);
    const elementRef = useRef<ElementRef<typeof defaultTag> | null>(null);

    useEffect(() => {
      setState(initialState);
    }, [initialState]);

    useEffect(() => {
      if (elementRef.current === null || state === "initial") {
        return;
      }
      return createPlayer(
        elementRef.current,
        {
          url,
          autoplay,
          autopause,
          background,
          byline,
          controls,
          doNotTrack,
          keyboard,
          loop,
          muted,
          pip,
          playsinline,
          portrait,
          quality,
          responsive,
          speed,
          title,
          transparent,
        },
        () => {
          setState("player");
        }
      );
    }, [
      state,
      autoplay,
      autopause,
      background,
      byline,
      controls,
      doNotTrack,
      keyboard,
      loop,
      muted,
      pip,
      playsinline,
      portrait,
      quality,
      responsive,
      speed,
      title,
      transparent,
    ]);
    return (
      <div
        {...rest}
        ref={(value: Ref) => {
          elementRef.current = value;
          if (ref !== null) {
            typeof ref === "function" ? ref(value) : (ref.current = value);
          }
        }}
        onClick={() => {
          setState("loading");
        }}
      >
        {
          // When playing we need to hide the play button
          state === "player" ? null : children
        }
      </div>
    );
  }
);

Vimeo.displayName = "Vimeo";
