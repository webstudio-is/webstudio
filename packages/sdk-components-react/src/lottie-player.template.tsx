import { type TemplateMeta, $, css } from "@webstudio-is/template";

export const meta: TemplateMeta = {
  label: "Lottie Animation",
  category: "media",
  order: 3,
  description:
    "Add a Lottie JSON animation to your page. Paste a public URL to your .json animation file in the Settings tab.",
  template: (
    <$.LottiePlayer
      ws:label="Lottie Animation"
      ws:style={css`
        width: 200px;
        height: 200px;
      `}
    />
  ),
};
