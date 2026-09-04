import { $, type TemplateMeta } from "@webstudio-is/template";
import { animation } from "./shared/proxy";
const { Video } = $;
const { VideoAnimation } = animation;

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
