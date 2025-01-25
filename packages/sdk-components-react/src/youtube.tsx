import {
  forwardRef,
  useState,
  useEffect,
  type ElementRef,
  type ComponentProps,
  useContext,
  type ContextType,
} from "react";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import { VimeoContext } from "./vimeo";

/**
 * Options for configuring the YouTube player parameters.
 * https://developers.google.com/youtube/player_parameters
 */
type YouTubePlayerParameters = {
  /**
   * Whether the video should autoplay.
   * Some browsers require the `muted` parameter to be set to `true` for autoplay to work.
   * @default false
   */
  autoplay?: boolean;
  /**
   * Whether the video should start muted.
   * Useful for enabling autoplay in browsers that require videos to be muted.
   * Original parameter: `mute`
   *@default false
   */
  muted?: boolean;

  /**
   * Whether to show player controls.
   * @default true
   */
  showControls?: boolean;

  /**
   * Whether to show related videos at the end.
   * Original parameter: `rel`
   * @default true
   */
  showRelatedVideos?: boolean;

  /**
   * Whether to enable keyboard controls.
   * @default true
   */
  keyboard?: boolean;

  /**
   * Whether the video should loop continuously.
   * @default false
   */
  loop?: boolean;

  /**
   * Whether to play inline on mobile (not fullscreen).
   * @default false
   */
  inline?: boolean;

  /**
   * Whether to allow fullscreen mode.
   * Original parameter: `fs`
   * @default true
   */
  allowFullscreen?: boolean;

  /**
   * Whether captions should be shown by default.
   * Original parameter: `cc_load_policy`
   * @default false
   */
  showCaptions?: boolean;

  /**
   * Whether to show annotations on the video.
   * Original parameter: `iv_load_policy`
   * @default true
   */
  showAnnotations?: boolean;

  /**
   * Start time of the video in seconds.
   * Original parameter: `start`
   */
  startTime?: number;

  /**
   * End time of the video in seconds.
   * Original parameter: `end`
   */
  endTime?: number;

  /**
   * Whether to disable keyboard controls.
   * Original parameter: `disablekb`
   * @default false
   */
  disableKeyboard?: boolean;

  /**
   * Referrer URL for tracking purposes.
   * Original parameter: `widget_referrer`
   */
  referrer?: string;

  /**
   * Type of playlist to load.
   */
  listType?: "playlist" | "user_uploads";

  /**
   * ID of the playlist to load.
   * Original parameter: `list`
   */
  listId?: string;

  /**
   * Your domain for API compliance (e.g., `https://yourdomain.com`).
   */
  origin?: string;

  /**
   * Specifies the default language that the player will use to display captions.
   * The value is an ISO 639-1 two-letter language code.
   * Original parameter: `cc_lang_pref`
   */
  captionLanguage?: string;

  /**
   * Sets the player's interface language. The value is an ISO 639-1 two-letter language code or a fully specified locale.
   * Original parameter: `hl`
   */
  language?: string;

  /**
   * Specifies the color that will be used in the player's video progress bar to highlight the amount of the video that the viewer has already seen.
   * Valid values are 'red' and 'white'.
   */
  color?: "red" | "white";

  /**
   * This parameter specifies a comma-separated list of video IDs to play
   */
  playlist?: string;
};

type YouTubePlayerOptions = {
  /** The YouTube video URL or ID */
  url?: string;
  showPreview?: boolean;
  /**
   * The Privacy Enhanced Mode of the YouTube embedded player prevents the use of views of embedded YouTube content from influencing the viewer’s browsing experience on YouTube.
   * https://support.google.com/youtube/answer/171780?hl=en#zippy=%2Cturn-on-privacy-enhanced-mode
   * @default true
   */
  privacyEnhancedMode?: boolean;
} & YouTubePlayerParameters & {
    /** Loading strategy for iframe */
    loading?: "eager" | "lazy";
  };

const PLAYER_PRIVACY_ENHANVED_MODE_CDN = "https://www.youtube-nocookie.com";
const PLAYER_ORIGINAL_CDN = "https://www.youtube.com";

const IMAGE_CDN = "https://img.youtube.com";

const getVideoId = (url?: string) => {
  if (!url) {
    return;
  }
  try {
    const urlObj = new URL(url);
    // It's already an embed URL, we don't need to extract video id.
    // It could be something like this https://youtube.com/embed?listType=playlist&list=UUjk2nKmHzgH5Xy-C5qYRd5A
    if (urlObj.pathname === "/embed") {
      return;
    }
    if (urlObj.hostname === "youtu.be") {
      return urlObj.pathname.slice(1);
    }
    return urlObj.searchParams.get("v") || urlObj.pathname.split("/").pop();
  } catch {
    // If not URL, assume it's a video ID
    return url;
  }
};

const getVideoUrl = (options: YouTubePlayerOptions, videoUrlOrigin: string) => {
  const videoId = getVideoId(options.url);
  const url = new URL(videoUrlOrigin);

  if (videoId) {
    url.pathname = `/embed/${videoId}`;
  } else if (options.url) {
    // E.g. this won't have videoId https://youtube.com/embed?listType=playlist&list=UUjk2nKmHzgH5Xy-C5qYRd5A
    // It may also contain parameters since its an embed URL, so we want to keep it as-is and just use the origin we predefined
    // so that no cookies option still works
    try {
      const parsedUrl = new URL(options.url);
      url.pathname = parsedUrl.pathname;
      url.search = parsedUrl.search;
    } catch {
      // Ignore invalid URL
    }
  }

  const optionsKeys = Object.keys(options) as (keyof YouTubePlayerParameters)[];

  const parameters: Record<string, string | undefined> = {};

  for (const optionsKey of optionsKeys) {
    switch (optionsKey) {
      case "autoplay":
        parameters.autoplay = options.autoplay ? "1" : "0";
        // Mute video if autoplay is enabled and muted is not touched
        if (options.autoplay && options.muted === undefined) {
          parameters.mute = "1";
        }
        break;

      case "muted":
        parameters.mute = options.muted ? "1" : "0";
        break;

      case "showControls":
        parameters.controls = options.showControls ? "1" : "0";
        break;

      case "showRelatedVideos":
        parameters.rel = options.showRelatedVideos ? "1" : "0";
        break;

      case "keyboard":
        parameters.keyboard = options.keyboard ? "1" : "0";
        break;

      case "loop":
        parameters.loop = options.loop ? "1" : "0";
        if (options.loop && (options.playlist ?? "").trim() === "") {
          parameters.playlist = videoId;
        }

        break;

      case "inline":
        parameters.playsinline = options.inline ? "1" : "0";
        break;

      case "allowFullscreen":
        parameters.fs = options.allowFullscreen ? "1" : "0";
        break;

      case "captionLanguage":
        parameters.cc_lang_pref = options.captionLanguage;
        break;

      case "showCaptions":
        parameters.cc_load_policy = options.showCaptions ? "1" : "0";
        break;

      case "showAnnotations":
        parameters.iv_load_policy = options.showAnnotations ? "1" : "3";
        break;

      case "startTime":
        parameters.start = options.startTime?.toString();
        break;

      case "endTime":
        parameters.end = options.endTime?.toString();
        break;

      case "disableKeyboard":
        parameters.disablekb = options.disableKeyboard ? "1" : "0";
        break;

      case "language":
        parameters.hl = options.language;
        break;

      case "listId":
        parameters.list = options.listId;
        break;

      case "listType":
        parameters.listType = options.listType;
        break;

      case "color":
        parameters.color = options.color;
        break;

      case "origin":
        parameters.origin = options.origin;
        break;
      case "referrer":
        parameters.widget_referrer = options.referrer;
        break;
      case "playlist":
        parameters.playlist = options.playlist;
        break;

      default:
        optionsKey satisfies never;
    }
  }

  Object.entries(parameters).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    url.searchParams.append(key, value.toString());
  });

  return url.toString();
};

const preconnect = (url: string) => {
  const link = document.createElement("link");
  link.rel = "preconnect";
  link.href = url;
  link.crossOrigin = "true";
  document.head.appendChild(link);
};

let warmed = false;

const warmConnections = (videoUrl: string) => {
  if (warmed || window.matchMedia("(hover: none)").matches) {
    return;
  }

  try {
    const videoUrlObject = new URL(videoUrl);

    preconnect(videoUrlObject.origin);
  } catch {
    // Ignore invalid URL
  }

  preconnect(IMAGE_CDN);
  warmed = true;
};

const getPreviewImageUrl = (videoId: string) => {
  return new URL(`${IMAGE_CDN}/vi/${videoId}/maxresdefault.jpg`);
};

type PlayerStatus = "initial" | "loading" | "ready";

const EmptyState = () => {
  return (
    <div className="flex w-full h-full items-center justify-center text-lg">
      Open the "Settings" panel and paste a video URL, e.g.
      https://youtube.com/watch?v=dQw4w9WgXcQ
    </div>
  );
};

type PlayerProps = Pick<
  YouTubePlayerOptions,
  "loading" | "autoplay" | "showPreview"
> & {
  videoUrl: string;
  title: string | undefined;
  status: PlayerStatus;
  renderer: ContextType<typeof ReactSdkContext>["renderer"];
  previewImageUrl?: URL;
  onStatusChange: (status: PlayerStatus) => void;
  onPreviewImageUrlChange: (url?: URL) => void;
};

const Player = ({
  title,
  status,
  loading,
  videoUrl,
  previewImageUrl,
  autoplay,
  renderer,
  showPreview,
  onStatusChange,
  onPreviewImageUrlChange,
}: PlayerProps) => {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (autoplay && renderer !== "canvas" && status === "initial") {
      onStatusChange("loading");
    }
  }, [autoplay, status, renderer, onStatusChange]);

  useEffect(() => {
    if (renderer !== "canvas") {
      warmConnections(videoUrl);
    }
  }, [renderer, videoUrl]);

  useEffect(() => {
    const videoId = getVideoId(videoUrl);
    if (!videoId || !showPreview) {
      onPreviewImageUrlChange(undefined);
      return;
    }

    if (!previewImageUrl) {
      onPreviewImageUrlChange(getPreviewImageUrl(videoId));
    }
  }, [onPreviewImageUrlChange, showPreview, videoUrl, previewImageUrl]);

  if (renderer === "canvas" || status === "initial") {
    return null;
  }

  return (
    <iframe
      title={title}
      src={videoUrl}
      loading={loading}
      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        opacity,
        transition: "opacity 1s",
        border: "none",
      }}
      onLoad={() => {
        onStatusChange("ready");
        setOpacity(1);
      }}
    />
  );
};

const defaultTag = "div";

type Props = Omit<
  ComponentProps<typeof defaultTag>,
  keyof YouTubePlayerOptions
> &
  YouTubePlayerOptions & {
    /**
     * The `title` attribute for the iframe.
     * Improves accessibility by providing a brief description of the video content for screen readers.
     * Example: "Video about web development tips".
     */
    title?: string | undefined;
  };
type Ref = ElementRef<typeof defaultTag>;

export const YouTube = forwardRef<Ref, Props>(
  (
    {
      url,
      loading = "lazy",
      autoplay,
      showPreview,
      children,
      privacyEnhancedMode,
      ...rest
    },
    ref
  ) => {
    const [status, setStatus] = useState<PlayerStatus>("initial");
    const [previewImageUrl, setPreviewImageUrl] = useState<URL>();
    const { renderer } = useContext(ReactSdkContext);

    const videoUrlOrigin =
      (privacyEnhancedMode ?? true)
        ? PLAYER_PRIVACY_ENHANVED_MODE_CDN
        : PLAYER_ORIGINAL_CDN;
    const videoUrl = getVideoUrl(
      {
        ...rest,
        url,
        autoplay: true,
      },
      videoUrlOrigin
    );

    return (
      <VimeoContext.Provider
        value={{
          status,
          previewImageUrl,
          onInitPlayer() {
            if (renderer !== "canvas") {
              setStatus("loading");
            }
          },
        }}
      >
        <div {...rest} ref={ref}>
          {!videoUrl ? (
            <EmptyState />
          ) : (
            <>
              {children}
              <Player
                title={rest.title}
                autoplay={autoplay}
                videoUrl={videoUrl}
                previewImageUrl={previewImageUrl}
                loading={loading}
                showPreview={showPreview}
                renderer={renderer}
                status={status}
                onStatusChange={setStatus}
                onPreviewImageUrlChange={setPreviewImageUrl}
              />
            </>
          )}
        </div>
      </VimeoContext.Provider>
    );
  }
);

YouTube.displayName = "YouTube";
