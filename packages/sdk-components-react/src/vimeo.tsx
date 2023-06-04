// Many implementation ideas came from
// https://github.com/slightlyoff/lite-vimeo
// Main reasons to not use it as is:
// - we don't want to render player by default
// - we want to expose Webstudio components to the user for customization

import { colord } from "colord";
import {
  forwardRef,
  useState,
  useRef,
  useEffect,
  type ElementRef,
  type ComponentProps,
  useContext,
  createContext,
} from "react";
import { ReactSdkContext } from "@webstudio-is/react-sdk";

const defaultTag = "div";

// https://developer.vimeo.com/player/sdk/embed
type VimeoPlayerOptions = {
  // @todo url type to validate url on the input
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
  // @todo use color type to use color control
  /** A color value of the playback controls, which is normally #00ADEF. The embed settings of the video might override this value. */
  color?: string;
  /** true	Whether to display the player's interactive elements, including the play bar and sharing buttons. Set this option to false for a chromeless experience. To control playback when the play/pause button is hidden, set autoplay to true, use keyboard controls (which remain active), or implement our player SDK. */
  controls?: boolean;
  /** Whether to prevent the player from tracking session data, including cookies. Keep in mind that setting this argument to true also blocks video stats. */
  dnt?: boolean;
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
  let url;
  try {
    const userUrl = new URL(options.url);
    url = new URL(IFRAME_CDN);
    url.pathname = `/video${userUrl.pathname}`;
    // eslint-disable-next-line no-empty
  } catch {}
  if (url === undefined) {
    return;
  }
  let option: keyof VimeoPlayerOptions;

  for (option in options) {
    if (option === "url") {
      continue;
    }
    const value = options[option];
    if (value === undefined) {
      continue;
    }
    if (option === "autoplay") {
      // We always set autoplay to true because we have a button that starts the video
      url.searchParams.append("autoplay", "true");
      continue;
    }
    // Vimeo needs a hex color value without the hash
    if (option === "color" && typeof value === "string") {
      const color = colord(value).toHex().replace("#", "");
      url.searchParams.append(option, color);
      continue;
    }

    url.searchParams.append(option, value.toString());
  }
  return url.toString();
};

const preconnect = (url: string) => {
  const link = document.createElement("link");
  link.rel = "preconnect";
  link.href = url;
  link.crossOrigin = "true";
  document.head.append(link);
};

let warmed = false;

// Host that Vimeo uses to serve JS needed by player
const PLAYER_CDN = "https://f.vimeocdn.com";
// The iframe document comes from player.vimeo.com
const IFRAME_CDN = "https://player.vimeo.com";
// Image for placeholder comes from i.vimeocdn.com
const IMAGE_CDN = "https://i.vimeocdn.com";

const warmConnections = () => {
  if (warmed) {
    return;
  }
  preconnect(PLAYER_CDN);
  preconnect(IFRAME_CDN);
  preconnect(IMAGE_CDN);
  warmed = true;
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
    "position: absolute; width: 100%; height: 100%; opacity: 0; transition: opacity 1s;"
  );

  // Show iframe only once it's loaded to avoid weird flashes.
  iframe.addEventListener(
    "load",
    () => {
      iframe.style.opacity = "1";
      callback();
    },
    { once: true }
  );
  parent.appendChild(iframe);

  return () => {
    iframe.parentElement?.removeChild(iframe);
  };
};

const getVideoId = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    const id = parsedUrl.pathname.split("/")[1];
    if (id === "" || id == null) {
      return;
    }
    return id;
    // eslint-disable-next-line no-empty
  } catch {}
};

const loadPreviewImage = async (element: HTMLElement, videoUrl: string) => {
  const videoId = getVideoId(videoUrl);
  // API is the video-id based
  // http://vimeo.com/api/v2/video/364402896.json
  const apiUrl = `https://vimeo.com/api/v2/video/${videoId}.json`;

  // Now fetch the JSON that locates our placeholder from vimeo's JSON API
  const response = (await (await fetch(apiUrl)).json())[0];

  // Extract the image id, e.g. 819916979, from a URL like:
  // thumbnail_large: "https://i.vimeocdn.com/video/819916979_640.jpg"
  const thumbnail = response.thumbnail_large;
  const imgId = thumbnail.substr(thumbnail.lastIndexOf("/") + 1).split("_")[0];

  const imageUrl = new URL(IMAGE_CDN);
  imageUrl.pathname = `/video/${imgId}.webp`;
  imageUrl.searchParams.append("mw", "1100");
  imageUrl.searchParams.append("mh", "619");
  imageUrl.searchParams.append("q", "70");
  return imageUrl;
};

export type WsVimeoOptions = Omit<
  VimeoPlayerOptions,
  "dnt" | "interactive_params"
> & {
  doNotTrack?: VimeoPlayerOptions["dnt"];
  interactiveParams?: VimeoPlayerOptions["interactive_params"];
  previewImage?: boolean;
};

type Props = Omit<ComponentProps<typeof defaultTag>, keyof WsVimeoOptions> &
  WsVimeoOptions;
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
      previewImage = false,
      autopip,
      color,
      interactiveParams,
      texttrack,
      children,
      ...rest
    },
    ref
  ) => {
    const { renderer } = useContext(ReactSdkContext);
    const [videoState, setVideoState] = useState<
      "initial" | "initialized" | "ready"
    >("initial");
    const elementRef = useRef<ElementRef<typeof defaultTag> | null>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<URL>();

    useEffect(() => {
      setVideoState(
        autoplay && renderer !== "canvas" ? "initialized" : "initial"
      );
    }, [autoplay, renderer]);

    useEffect(() => {
      if (
        elementRef.current === null ||
        videoState === "ready" ||
        url === undefined
      ) {
        return;
      }
      if (previewImage) {
        loadPreviewImage(elementRef.current, url).then(setPreviewImageUrl);
      } else {
        setPreviewImageUrl(undefined);
      }
    }, [renderer, previewImage, url, videoState]);

    useEffect(() => {
      if (elementRef.current === null || videoState === "initial") {
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
          dnt: doNotTrack,
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
          interactive_params: interactiveParams,
          color,
        },
        () => {
          setVideoState("ready");
        }
      );
    }, [
      url,
      videoState,
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
      interactiveParams,
      color,
    ]);

    return (
      <VimeoContext.Provider
        value={{
          previewImageUrl,
          onInitPlayer() {
            if (renderer !== "canvas") {
              setVideoState("initialized");
            }
          },
        }}
      >
        <div
          {...rest}
          ref={(value: Ref) => {
            elementRef.current = value;
            if (ref !== null) {
              typeof ref === "function" ? ref(value) : (ref.current = value);
            }
          }}
          onPointerOver={() => {
            if (renderer !== "canvas") {
              warmConnections();
            }
          }}
        >
          {
            // When playing we need to hide the play button
            url === undefined ? <EmptyState /> : children
          }
        </div>
      </VimeoContext.Provider>
    );
  }
);

Vimeo.displayName = "Vimeo";

const EmptyState = () => {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.2em",
      }}
    >
      Open the Properties panel and paste a video URL, e.g.
      https://vimeo.com/831343124.
    </div>
  );
};

export const VimeoContext = createContext<{
  previewImageUrl?: URL;
  onInitPlayer: () => void;
}>({
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onInitPlayer: () => {},
});
