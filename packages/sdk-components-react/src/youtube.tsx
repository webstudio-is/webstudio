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

type YouTubePlayerOptions = {
  /** The YouTube video URL or ID */
  url?: string;
  /** Whether to start playback automatically */
  autoplay?: boolean;
  /** Whether to show video controls */
  showControls?: boolean;
  /** Whether to show related videos at the end */
  showRelatedVideos?: boolean;
  /** Whether to enable keyboard controls */
  keyboard?: boolean;
  /** Whether to loop the video */
  loop?: boolean;
  /** Whether to start muted */
  muted?: boolean;
  /** Whether video plays inline on mobile */
  playsinline?: boolean;
  /** Video playback quality */
  quality?: "auto" | "small" | "medium" | "large" | "hd720" | "hd1080";
  /** Whether to show preview image */
  showPreview?: boolean;
  /** Loading strategy for iframe */
  loading?: "eager" | "lazy";
};

const PLAYER_CDN = "https://www.youtube.com";
const IMAGE_CDN = "https://img.youtube.com";

const getVideoId = (url?: string) => {
  if (!url) {
    return;
  }
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === "youtu.be") {
      return urlObj.pathname.slice(1);
    }
    return urlObj.searchParams.get("v") || urlObj.pathname.split("/").pop();
  } catch {
    // If not URL, assume it's a video ID
    return url;
  }
};

const getVideoUrl = (options: YouTubePlayerOptions) => {
  const videoId = getVideoId(options.url);
  if (!videoId) {
    return;
  }

  const url = new URL(`${PLAYER_CDN}/embed/${videoId}`);
  const params = {
    autoplay: options.autoplay ? "1" : "0",
    controls: options.showControls ? "1" : "0",
    rel: options.showRelatedVideos ? "1" : "0",
    keyboard: options.keyboard ? "1" : "0",
    loop: options.loop ? "1" : "0",
    mute: options.muted ? "1" : "0",
    playsinline: options.playsinline ? "1" : "0",
  };

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
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

const warmConnections = () => {
  if (warmed || window.matchMedia("(hover: none)").matches) {
    return;
  }
  preconnect(PLAYER_CDN);
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
  status: PlayerStatus;
  renderer: ContextType<typeof ReactSdkContext>["renderer"];
  previewImageUrl?: URL;
  onStatusChange: (status: PlayerStatus) => void;
  onPreviewImageUrlChange: (url?: URL) => void;
};

const Player = ({
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
      warmConnections();
    }
  }, [renderer]);

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
  YouTubePlayerOptions;
type Ref = ElementRef<typeof defaultTag>;

export const YouTube = forwardRef<Ref, Props>(
  (
    {
      url,
      loading = "lazy",
      autoplay = false,
      showControls = true,
      showRelatedVideos = false,
      keyboard = true,
      loop = false,
      muted = false,
      playsinline = true,
      quality = "auto",
      showPreview = false,
      children,
      ...rest
    },
    ref
  ) => {
    const [status, setStatus] = useState<PlayerStatus>("initial");
    const [previewImageUrl, setPreviewImageUrl] = useState<URL>();
    const { renderer } = useContext(ReactSdkContext);

    const videoUrl = getVideoUrl({
      url,
      autoplay: true,
      showControls,
      showRelatedVideos,
      keyboard,
      loop,
      muted,
      playsinline,
      quality,
    });

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
