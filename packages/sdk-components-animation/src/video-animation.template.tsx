import { $, type TemplateMeta } from "@webstudio-is/template";
import { animation } from "./shared/proxy";

export const meta: TemplateMeta = {
  category: "animations",
  description: "Video Animation",
  order: 2,
  template: (
    <animation.VideoAnimation>
      <$.Video
        preload="auto"
        autoPlay={true}
        muted={true}
        playsInline={true}
        crossOrigin="anonymous"
      ></$.Video>
    </animation.VideoAnimation>
  ),
};
