import { PlayIcon, SpinnerIcon } from "@webstudio-is/icons/svg";
import { type TemplateMeta, $, css } from "@webstudio-is/template";

export const meta: TemplateMeta = {
  category: "media",
  order: 1,
  description:
    "Add a video to your page that is hosted on Vimeo. Paste a Vimeo URL and configure the video in the Settings tab.",
  template: (
    <$.Vimeo
      ws:style={css`
        position: relative;
        aspect-ratio: 640/360;
        width: 100%;
      `}
    >
      <$.VimeoPreviewImage
        ws:style={css`
          position: absolute;
          object-fit: cover;
          object-position: center;
          width: 100%;
          height: 100%;
          border-radius: 20px;
        `}
        alt="Vimeo video preview image"
        sizes="100vw"
        optimize={true}
      />
      <$.VimeoSpinner
        ws:label="Spinner"
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
        <$.HtmlEmbed ws:label="Spinner SVG" code={SpinnerIcon} />
      </$.VimeoSpinner>
      <$.VimeoPlayButton
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
        <$.Box
          ws:label="Play Icon"
          ws:style={css`
            width: 60px;
            height: 60px;
          `}
          aria-hidden={true}
        >
          <$.HtmlEmbed ws:label="Play SVG" code={PlayIcon} />
        </$.Box>
      </$.VimeoPlayButton>
    </$.Vimeo>
  ),
};
