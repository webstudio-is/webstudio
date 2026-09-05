/** @jsxImportSource @webstudio-is/template */
import { PlayIcon, SpinnerIcon } from "@webstudio-is/icons/svg";
import {
  type TemplateMeta,
  css,
  setInstanceMeta,
} from "@webstudio-is/template";
import { iconEmbedStyle } from "./shared/icon-embed-style";
import {
  HtmlEmbed,
  VimeoPlayButton,
  VimeoPreviewImage,
  VimeoSpinner,
  YouTube,
} from "./components";

export const meta: TemplateMeta = {
  label: "YouTube",
  category: "media",
  order: 1,
  description:
    "Add a video to your page that is hosted on YouTube. Paste a YouTube URL and configure the video in the Settings tab.",
  template: setInstanceMeta(
    { label: "YouTube" },
    <YouTube
      ws:style={css`
        position: relative;
        aspect-ratio: 640/360;
        width: 100%;
      `}
    >
      {setInstanceMeta(
        { label: "Preview Image" },
        <VimeoPreviewImage
          ws:style={css`
            position: absolute;
            object-fit: cover;
            object-position: center;
            width: 100%;
            height: 100%;
            border-radius: 20px;
          `}
          alt="YouTube video preview image"
          sizes="100vw"
          optimize={true}
        />
      )}
      {setInstanceMeta(
        { label: "Spinner" },
        <VimeoSpinner
          ws:style={css`
            position: absolute;
            top: 50%;
            left: 50%;
            width: 70px;
            height: 70px;
            margin-top: -35px;
            margin-left: -35px;
          `}
        >
          {setInstanceMeta(
            { label: "Spinner SVG" },
            <HtmlEmbed ws:style={iconEmbedStyle} code={SpinnerIcon} />
          )}
        </VimeoSpinner>
      )}
      {setInstanceMeta(
        { label: "Play Button" },
        <VimeoPlayButton
          ws:style={css`
            position: absolute;
            width: 140px;
            height: 80px;
            top: 50%;
            left: 50%;
            margin-top: -40px;
            margin-left: -70px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-style: none;
            border-radius: 5px;
            cursor: pointer;
            background-color: rgb(18, 18, 18);
            color: rgb(255, 255, 255);
            &:hover {
              background-color: rgb(0, 173, 239);
            }
          `}
          aria-label="Play button"
        >
          {setInstanceMeta(
            { label: "Play Icon" },
            <div
              ws:style={css`
                width: 60px;
                height: 60px;
              `}
              aria-hidden={true}
            >
              {setInstanceMeta(
                { label: "Play SVG" },
                <HtmlEmbed ws:style={iconEmbedStyle} code={PlayIcon} />
              )}
            </div>
          )}
        </VimeoPlayButton>
      )}
    </YouTube>
  ),
};
