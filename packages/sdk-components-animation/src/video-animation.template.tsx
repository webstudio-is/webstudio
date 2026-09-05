/** @jsxImportSource @webstudio-is/template */
import type { TemplateMeta } from "@webstudio-is/template";
import { Video } from "@webstudio-is/sdk-components-react/components";
import { VideoAnimation } from "./video-animation";

export const meta: TemplateMeta = {
  category: "animations",
  description: "Video Animation",
  order: 2,
  template: (
    <VideoAnimation>
      <Video
        preload="auto"
        autoPlay={true}
        muted={true}
        playsInline={true}
        crossOrigin="anonymous"
      />
    </VideoAnimation>
  ),
};
