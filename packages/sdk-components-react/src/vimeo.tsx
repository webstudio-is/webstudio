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
  type ContextType,
  useMemo,
} from "react";
import { ReactSdkContext } from "@webstudio-is/react-sdk";
import { shallowEqual } from "shallow-equal";

const defaultTag = "div";

// https://developer.vimeo.com/player/sdk/embed
type VimeoPlayerOptions = {
  background?: boolean;
  color?: string;
  controls?: boolean;
  dnt?: boolean;
  interactive_params?: string;
  title?: boolean;
  portrait?: boolean;
  // @todo url type to validate url on the input
  /** The ID or the URL of the video on Vimeo. You must supply one of these values to identify the video. When the video's privacy setting is Private, you must use the URL, and the URL must include the h parameter. For more information, see Vimeo’s introductory guide. */
  url?: string;
  /** Whether to pause the current video when another Vimeo video on the same page starts to play. Set this value to false to permit simultaneous playback of all the videos on the page. This option has no effect if you've disabled cookies in your browser, either through browser settings or with an extension or plugin. */
  autopause?: boolean;
  /** Whether to enable the browser to enter picture-in-picture mode automatically when switching tabs or windows, where supported. */
  autopip?: boolean;
  /** Whether to start playback of the video automatically. This feature might not work on all devices. */
  autoplay?: boolean;
  /** Whether to display the video owner's name. */
  byline?: boolean;
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
    const value = options[option];
    if (option === "url" || value === undefined) {
      continue;
    }
    url.searchParams.append(option, value.toString());
  }

  // We always set autoplay to true because we have a button that starts the video
  url.searchParams.set("autoplay", "true");

  // Vimeo needs a hex color value without the hash
  if (typeof options.color === "string") {
    const color = colord(options.color).toHex().replace("#", "");
    url.searchParams.set("color", color);
  }

  // Portrait option won't work if at title is not set to true
  if (options.portrait) {
    url.searchParams.set("title", "true");
  }
  // Byline won't show up if portrait and title is not set to true
  if (options.byline) {
    url.searchParams.set("portrait", "true");
    url.searchParams.set("title", "true");
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

type PlayerStatus = "initial" | "initialized" | "ready";

const useVimeo = ({
  options,
  renderer,
  showPreview,
}: {
  options: VimeoPlayerOptions;
  showPreview?: boolean;
  renderer: ContextType<typeof ReactSdkContext>["renderer"];
}) => {
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>("initial");
  const elementRef = useRef<ElementRef<typeof defaultTag> | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<URL>();

  useEffect(() => {
    setPlayerStatus(
      options.autoplay && renderer !== "canvas" ? "initialized" : "initial"
    );
  }, [options.autoplay, renderer]);

  useEffect(() => {
    if (
      elementRef.current === null ||
      playerStatus === "ready" ||
      options.url === undefined
    ) {
      return;
    }
    if (showPreview) {
      loadPreviewImage(elementRef.current, options.url).then(
        setPreviewImageUrl
      );
      return;
    }
    setPreviewImageUrl(undefined);
  }, [renderer, showPreview, options.url, playerStatus]);

  const optionsRef = useRef(options);
  const stableOptions = useMemo(() => {
    if (shallowEqual(options, optionsRef.current) === false) {
      optionsRef.current = options;
    }
    return optionsRef.current;
  }, [options]);

  useEffect(() => {
    if (elementRef.current === null || playerStatus === "initial") {
      return;
    }
    return createPlayer(elementRef.current, stableOptions, () => {
      setPlayerStatus("ready");
    });
  }, [stableOptions, playerStatus]);
  return { previewImageUrl, playerStatus, setPlayerStatus, elementRef };
};

export type VimeoOptions = Omit<
  VimeoPlayerOptions,
  | "dnt"
  | "interactive_params"
  | "background"
  | "controls"
  | "color"
  | "byline"
  | "title"
  | "portrait"
> & {
  /** Whether the preview image should be loaded from Vimeo API. Ideally don't use it, because it will show up with some delay and will make your site feel slower. */
  showPreview?: boolean;
  /** Whether to prevent the player from tracking session data, including cookies. Keep in mind that setting this argument to true also blocks video stats. */
  doNotTrack?: VimeoPlayerOptions["dnt"];
  /** Key-value pairs representing dynamic parameters that are utilized on interactive videos with live elements, such as title=my-video,subtitle=interactive. */
  interactiveParams?: VimeoPlayerOptions["interactive_params"];
  /** Whether the player is in background mode, which hides the playback controls, enables autoplay, and loops the video. */
  backgroundMode?: VimeoPlayerOptions["background"];
  /** Whether to display the player's interactive elements, including the play bar and sharing buttons. Set this option to false for a chromeless experience. To control playback when the play/pause button is hidden, set autoplay to true, use keyboard controls (which remain active), or implement our player SDK. */
  showControls?: VimeoPlayerOptions["controls"];
  // @todo use color type to use color control
  /** A color value of the playback controls, which is normally #00ADEF. The embed settings of the video might override this value. */
  controlsColor?: VimeoPlayerOptions["color"];
  /** Whether to display the video owner's name. */
  showByline?: VimeoPlayerOptions["byline"];
  /** Whether the player displays the title overlay. */
  showTitle?: VimeoPlayerOptions["title"];
  /** Whether to display the video owner's portrait. Only works if either title or byline are also enabled */
  showPortrait?: VimeoPlayerOptions["portrait"];
};

type Props = Omit<ComponentProps<typeof defaultTag>, keyof VimeoOptions> &
  VimeoOptions;
type Ref = ElementRef<typeof defaultTag>;

export const Vimeo = forwardRef<Ref, Props>(
  (
    {
      url,
      autoplay = false,
      autopause = true,
      backgroundMode = false,
      showByline = false,
      showControls = true,
      doNotTrack = false,
      keyboard = true,
      loop = false,
      muted = false,
      pip = false,
      playsinline = true,
      showPortrait = true,
      quality = "auto",
      responsive = true,
      speed = false,
      showTitle = false,
      transparent = true,
      showPreview = false,
      autopip,
      controlsColor,
      interactiveParams,
      texttrack,
      children,
      ...rest
    },
    ref
  ) => {
    const { renderer } = useContext(ReactSdkContext);
    const { previewImageUrl, playerStatus, setPlayerStatus, elementRef } =
      useVimeo({
        renderer,
        showPreview,
        options: {
          url,
          autoplay,
          autopause,
          keyboard,
          loop,
          muted,
          pip,
          playsinline,
          quality,
          responsive,
          speed,
          transparent,
          portrait: showPortrait,
          byline: showByline,
          title: showTitle,
          color: controlsColor,
          controls: showControls,
          interactive_params: interactiveParams,
          background: backgroundMode,
          dnt: doNotTrack,
        },
      });

    return (
      <VimeoContext.Provider
        value={{
          status: playerStatus,
          previewImageUrl,
          onInitPlayer() {
            if (renderer !== "canvas") {
              setPlayerStatus("initialized");
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
          {url === undefined ? <EmptyState /> : children}
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
      {
        'Open the "Settings" panel and paste a video URL, e.g. https://vimeo.com/831343124.'
      }
    </div>
  );
};

export const VimeoContext = createContext<{
  previewImageUrl?: URL;
  onInitPlayer: () => void;
  status: PlayerStatus;
}>({
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onInitPlayer: () => {},
  status: "initial",
});
