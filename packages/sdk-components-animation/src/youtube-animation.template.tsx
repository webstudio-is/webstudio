import { $, css, type TemplateMeta } from "@webstudio-is/template";
import { YoutubeIcon } from "@webstudio-is/icons/svg";
import { animation } from "./shared/proxy";

export const meta: TemplateMeta = {
  category: "animations",
  description: "YouTube Animation",
  order: 2,
  icon: YoutubeIcon,

  template: (
    <animation.YouTubeAnimation>
      <$.YouTube
        ws:label="YouTube"
        ws:style={css`
          position: relative;
          width: 100%;
          max-width: 100%;
        `}
        inline={true}
        autoplay={true}
        muted={true}
        showControls={false}
        showPreview={false}
        keyboard={false}
        allowFullscreen={false}
        showCaptions={false}
        showAnnotations={false}
      ></$.YouTube>
    </animation.YouTubeAnimation>
  ),
};
